"""AI 能力接口：识图、营养分析、食谱草稿与推荐。"""

from __future__ import annotations

import logging
from datetime import date

from flask import Blueprint, jsonify, request

from ai_end.services.ai_service import AIService
from backend.repository.admin_dashboard_repository import AdminDashboardRepository
from backend.repository.health_rule_repository import HealthRuleRepository
from backend.repository.profile_repository import ProfileRepository
from backend.repository.recipe_repository import RecipeRepository
from backend.routes.auth import login_required
from backend.services.cache_service import (
    get_global_recipe_library_version,
    get_recipe_recommend_cache,
    get_user_state_version,
    set_recipe_recommend_cache,
)
from backend.services.nutrition_service import (
    build_goal_checks,
    build_health_warnings,
    build_macro_ratio,
    build_suggestions,
    default_goals,
    sum_nutrition,
)
from backend.services.recipe_cover_service import (
    is_recipe_cover_data_url,
    normalize_recipe_cover_url,
    store_recipe_cover_data_url,
)
from backend.utils.request_context import get_request_user_id

bp = Blueprint("ai", __name__)
logger = logging.getLogger(__name__)

ai_service = AIService()
profile_repo = ProfileRepository()
rule_repo = HealthRuleRepository()
recipe_repo = RecipeRepository()
dashboard_repo = AdminDashboardRepository()


def _image_payload_or_400(data: dict):
    image_base64 = data.get("image_base64")
    image_url = data.get("image_url")
    hint_text = data.get("hint_text")
    if not image_base64 and not image_url and not hint_text:
        return None, jsonify({"error": "请至少提供 image_base64、image_url 或 hint_text 之一"}), 400
    return (image_base64, image_url, hint_text), None, None


def _public_base_url() -> str:
    return request.host_url.rstrip("/")


def _coerce_recipe_id(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_recipe_cover_item(item: dict) -> dict:
    normalized = dict(item)
    cover_url = normalized.get("cover_url")
    if is_recipe_cover_data_url(cover_url):
        try:
            stored_cover_url = store_recipe_cover_data_url(str(cover_url), _public_base_url())
            normalized["cover_url"] = normalize_recipe_cover_url(stored_cover_url, _public_base_url())
            recipe_id = _coerce_recipe_id(normalized.get("id") or normalized.get("recipe_id"))
            if recipe_id is not None:
                recipe_repo.update_cover_url(recipe_id, stored_cover_url)
        except ValueError:
            normalized["cover_url"] = None
    else:
        normalized["cover_url"] = normalize_recipe_cover_url(cover_url, _public_base_url())
    return normalized


def _normalize_recipe_cover_items(items: list[dict]) -> list[dict]:
    return [_normalize_recipe_cover_item(item) for item in items if isinstance(item, dict)]


def _normalize_recommend_result(result: dict) -> dict:
    normalized = dict(result)
    for key in ("items", "recipes", "local_recipes", "server_recipes"):
        if isinstance(normalized.get(key), list):
            normalized[key] = _normalize_recipe_cover_items(normalized[key])
    return normalized


def _recipe_name_key(recipe: dict) -> str:
    return "".join(str(recipe.get("name") or "").split()).lower()


def _prefer_local_recipes_by_name(recipes: list[dict]) -> list[dict]:
    by_name: dict[str, dict] = {}
    order: list[str] = []
    for recipe in recipes:
        key = _recipe_name_key(recipe)
        if not key:
            continue
        existing_recipe = by_name.get(key)
        if existing_recipe is None:
            by_name[key] = recipe
            order.append(key)
            continue
        if recipe.get("library_scope") == "local" and existing_recipe.get("library_scope") != "local":
            by_name[key] = recipe
    return [by_name[key] for key in order]


def _extract_ai_meta(value):
    if isinstance(value, dict):
        meta = value.get("_meta_ai")
        if isinstance(meta, dict):
            return meta
        for item in value.values():
            found = _extract_ai_meta(item)
            if isinstance(found, dict):
                return found
        return None
    if isinstance(value, list):
        for item in value:
            found = _extract_ai_meta(item)
            if isinstance(found, dict):
                return found
    return None


def _strip_private_fields(value):
    if isinstance(value, dict):
        return {
            key: _strip_private_fields(item)
            for key, item in value.items()
            if not str(key).startswith("_")
        }
    if isinstance(value, list):
        return [_strip_private_fields(item) for item in value]
    return value


def _log_ai_usage_if_available(result, *, endpoint: str, user_id) -> None:
    if not user_id:
        return

    meta = _extract_ai_meta(result)
    if not isinstance(meta, dict):
        return

    usage = meta.get("usage") if isinstance(meta.get("usage"), dict) else {}
    try:
        dashboard_repo.log_ai_usage(
            user_id,
            endpoint=endpoint,
            provider=str(meta.get("provider") or "unknown"),
            model_name=str(meta.get("model") or "unknown"),
            model_kind=str(meta.get("model_kind") or "text"),
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            total_tokens=int(usage.get("total_tokens") or 0),
        )
    except Exception:  # pragma: no cover
        logger.exception("failed to log ai usage for endpoint %s", endpoint)


@bp.route("/recognize", methods=["POST"])
@login_required
def recognize_food():
    data = request.get_json(silent=True) or {}
    payload, error_response, status = _image_payload_or_400(data)
    if error_response is not None:
        return error_response, status

    image_base64, image_url, hint_text = payload
    try:
        result = ai_service.recognize_foods(image_base64, image_url, hint_text)
        _log_ai_usage_if_available(
            result,
            endpoint="/api/ai/recognize",
            user_id=get_request_user_id(request),
        )
        return jsonify(_strip_private_fields(result)), 200
    except Exception as exc:  # pragma: no cover
        logger.exception("food recognition failed")
        return jsonify({"error": f"识别失败: {exc}"}), 500


@bp.route("/recipe-draft", methods=["POST"])
@login_required
def extract_recipe_draft():
    data = request.get_json(silent=True) or {}
    payload, error_response, status = _image_payload_or_400(data)
    if error_response is not None:
        return error_response, status

    image_base64, image_url, hint_text = payload
    try:
        result = ai_service.extract_recipe_draft(image_base64, image_url, hint_text)
        _log_ai_usage_if_available(
            result,
            endpoint="/api/ai/recipe-draft",
            user_id=get_request_user_id(request),
        )
        return jsonify(_strip_private_fields(result)), 200
    except Exception as exc:  # pragma: no cover
        logger.exception("recipe draft extraction failed")
        return jsonify({"error": f"识别食谱资料失败: {exc}"}), 500


@bp.route("/analyze", methods=["POST"])
@login_required
def analyze_nutrition():
    data = request.get_json(silent=True) or {}
    items = data.get("items") or []
    if not isinstance(items, list):
        return jsonify({"error": "items 必须是数组"}), 400

    user_id = get_request_user_id(request)
    profile = profile_repo.get_profile(user_id) if user_id else None
    goals = profile_repo.get_goals(user_id) if user_id else None
    health_tags = (profile or {}).get("chronic_conditions") or []
    rules = rule_repo.list_rules()

    totals = sum_nutrition(items)
    macro_ratio = build_macro_ratio(totals)
    goal_values = goals or default_goals()
    goal_checks = build_goal_checks(totals, goal_values)
    warnings = build_health_warnings(items, health_tags, rules)
    suggestions = build_suggestions(goal_checks)

    ai_result = ai_service.analyze_nutrition(
        {
            "date": date.today().isoformat(),
            "items": items,
            "profile": profile or {},
            "goals": goal_values,
            "totals": totals,
            "macro_ratio": macro_ratio,
            "goal_checks": goal_checks,
            "warnings": warnings,
            "suggestions": suggestions,
        }
    )

    response_payload = {
        "totals": totals,
        "macro_ratio": macro_ratio,
        "goal_checks": goal_checks,
        "warnings": warnings,
        "suggestions": suggestions,
        "ai": ai_result,
    }
    _log_ai_usage_if_available(
        response_payload,
        endpoint="/api/ai/analyze",
        user_id=user_id,
    )

    return (
        jsonify(_strip_private_fields(response_payload)),
        200,
    )


@bp.route("/recommend", methods=["POST"])
@login_required
def recommend_recipes():
    data = request.get_json(silent=True) or {}
    user_id = get_request_user_id(request)
    state_version = get_user_state_version(user_id) if user_id else 0
    library_version = get_global_recipe_library_version()
    recommend_version = state_version * 1000000 + library_version
    cached_result = get_recipe_recommend_cache(user_id, recommend_version, data) if user_id else None
    if cached_result is not None:
        return jsonify(_strip_private_fields(_normalize_recommend_result(cached_result))), 200

    profile = profile_repo.get_profile(user_id) if user_id else None
    goals = profile_repo.get_goals(user_id) if user_id else None
    rules = rule_repo.list_rules()
    local_recipes = _normalize_recipe_cover_items(
        recipe_repo.list_recipes(
            user_id=user_id,
            keyword=data.get("keyword"),
            tag=data.get("tag"),
            scope="local",
        )
    )
    server_recipes = _normalize_recipe_cover_items(
        recipe_repo.list_recipes(
            user_id=user_id,
            keyword=data.get("keyword"),
            tag=data.get("tag"),
            scope="server",
        )
    )
    context = {
        **data,
        "library_only": True,
        "prefer_external": False,
        "prefer_local_library": True,
        "allow_server_library": True,
    }
    recommendation_recipes = _prefer_local_recipes_by_name([*local_recipes, *server_recipes])
    result = ai_service.recommend_recipes(
        {
            "profile": profile or {},
            "goals": goals or default_goals(),
            "rules": rules,
            "recipes": recommendation_recipes,
            "context": context,
        }
    )
    result = {
        **result,
        "recipes": [*local_recipes, *server_recipes],
        "local_recipes": local_recipes,
        "server_recipes": server_recipes,
    }
    _log_ai_usage_if_available(
        result,
        endpoint="/api/ai/recommend",
        user_id=user_id,
    )
    public_result = _strip_private_fields(_normalize_recommend_result(result))
    if user_id:
        set_recipe_recommend_cache(user_id, recommend_version, data, public_result)
    return jsonify(public_result), 200
