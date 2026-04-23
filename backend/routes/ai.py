"""AI能力接口：食物识别、营养分析与推荐。"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from flask import Blueprint, jsonify, request

from backend.routes.auth import login_required
from ai_end.services.ai_service import AIService
from backend.services.cache_service import (
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
from backend.repository.profile_repository import ProfileRepository
from backend.repository.health_rule_repository import HealthRuleRepository
from backend.repository.recipe_repository import RecipeRepository
from backend.services.external_recipe_service import ExternalRecipeService
from backend.utils.request_context import get_request_user_id

bp = Blueprint("ai", __name__)
logger = logging.getLogger(__name__)

ai_service = AIService()
profile_repo = ProfileRepository()
rule_repo = HealthRuleRepository()
recipe_repo = RecipeRepository()
external_recipe_service = ExternalRecipeService()


def _parse_non_negative_int(value: Any) -> int:
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return 0


@bp.route("/recognize", methods=["POST"])
@login_required
def recognize_food():
    data = request.get_json(silent=True) or {}
    image_base64 = data.get("image_base64")
    image_url = data.get("image_url")
    hint_text = data.get("hint_text")
    if not image_base64 and not image_url and not hint_text:
        return jsonify({"error": "请至少提供 image_base64、image_url 或 hint_text 之一"}), 400

    try:
        result = ai_service.recognize_foods(image_base64, image_url, hint_text)
        return jsonify(result), 200
    except Exception as exc:  # pragma: no cover
        logger.exception("food recognition failed")
        return jsonify({"error": f"识别失败: {exc}"}), 500


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

    return (
        jsonify(
            {
                "totals": totals,
                "macro_ratio": macro_ratio,
                "goal_checks": goal_checks,
                "warnings": warnings,
                "suggestions": suggestions,
                "ai": ai_result,
            }
        ),
        200,
    )


@bp.route("/recommend", methods=["POST"])
@login_required
def recommend_recipes():
    data = request.get_json(silent=True) or {}
    user_id = get_request_user_id(request)
    state_version = get_user_state_version(user_id) if user_id else 0
    cached_result = get_recipe_recommend_cache(user_id, state_version, data) if user_id else None
    if cached_result is not None:
        return jsonify(cached_result), 200

    profile = profile_repo.get_profile(user_id) if user_id else None
    goals = profile_repo.get_goals(user_id) if user_id else None
    rules = rule_repo.list_rules()
    local_recipes = recipe_repo.list_recipes(user_id=user_id, keyword=data.get("keyword"), tag=data.get("tag"))
    try:
        external_recipes = external_recipe_service.list_candidates(
            keyword=data.get("keyword"),
            limit=12,
            exclude_names=data.get("exclude_names") if isinstance(data.get("exclude_names"), list) else None,
            refresh_round=_parse_non_negative_int(data.get("refresh_round")),
        )
    except Exception:  # pragma: no cover
        logger.exception("external recipe fetch failed")
        external_recipes = []
    result = ai_service.recommend_recipes(
        {
            "profile": profile or {},
            "goals": goals or default_goals(),
            "rules": rules,
            "recipes": local_recipes + external_recipes,
            "context": data,
        }
    )
    if user_id:
        set_recipe_recommend_cache(user_id, state_version, data, result)
    return jsonify(result), 200
