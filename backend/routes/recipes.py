"""食谱接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.recipe_repository import RecipeRepository
from backend.routes.auth import login_required
from backend.services.cache_service import bump_global_recipe_library_version, bump_user_state_version
from backend.services.recipe_cover_service import (
    is_recipe_cover_data_url,
    normalize_recipe_cover_url,
    prepare_recipe_cover_payload,
    store_recipe_cover_data_url,
)
from backend.utils.request_context import get_request_user_id

bp = Blueprint("recipes", __name__)
recipe_repo = RecipeRepository()


def _resolve_scope(default: str = "all") -> str:
    scope = request.args.get("scope")
    if scope is None:
        data = request.get_json(silent=True) or {}
        scope = data.get("scope")
    normalized = str(scope or default).strip().lower()
    return normalized if normalized in {"all", "local", "server"} else default


def _request_is_admin() -> bool:
    claims = getattr(request, "auth_claims", {}) or {}
    roles = claims.get("roles") or []
    return "admin" in roles or "webmaster" in roles


def _public_base_url() -> str:
    return request.host_url.rstrip("/")


def _coerce_recipe_id(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_recipe_for_response(recipe: dict) -> dict:
    normalized = dict(recipe)
    cover_url = normalized.get("cover_url")
    if is_recipe_cover_data_url(cover_url):
        try:
            stored_cover_url = store_recipe_cover_data_url(str(cover_url), _public_base_url())
            normalized["cover_url"] = normalize_recipe_cover_url(stored_cover_url, _public_base_url())
            recipe_id = _coerce_recipe_id(normalized.get("id"))
            if recipe_id is not None:
                recipe_repo.update_cover_url(recipe_id, stored_cover_url)
        except ValueError:
            normalized["cover_url"] = None
    else:
        normalized["cover_url"] = normalize_recipe_cover_url(cover_url, _public_base_url())
    return normalized


def _normalize_recipes_for_response(recipes: list[dict]) -> list[dict]:
    return [_normalize_recipe_for_response(recipe) for recipe in recipes]


@bp.route("", methods=["GET"])
@login_required
def list_recipes():
    keyword = request.args.get("keyword")
    tag = request.args.get("tag")
    scope = _resolve_scope("all")
    user_id = get_request_user_id(request)
    recipes = recipe_repo.list_recipes(user_id=user_id, keyword=keyword, tag=tag, scope=scope)
    return jsonify({"recipes": _normalize_recipes_for_response(recipes)}), 200


@bp.route("", methods=["POST"])
@login_required
def create_recipe():
    try:
        data = prepare_recipe_cover_payload(request.get_json(silent=True) or {}, _public_base_url())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not data.get("name"):
      return jsonify({"error": "name 必填"}), 400

    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    scope = _resolve_scope("local")
    if scope == "server" and not _request_is_admin():
        return jsonify({"error": "需要管理员权限"}), 403

    recipe, created = recipe_repo.create_recipe(
        user_id,
        data,
        scope="server" if scope == "server" else "local",
    )
    if created:
        if scope == "server":
            bump_global_recipe_library_version()
        else:
            bump_user_state_version(user_id)
    return jsonify({"recipe": _normalize_recipe_for_response(recipe), "created": created}), 201 if created else 200


@bp.route("/<int:recipe_id>", methods=["PUT"])
@login_required
def update_recipe(recipe_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    try:
        data = prepare_recipe_cover_payload(request.get_json(silent=True) or {}, _public_base_url())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    scope = _resolve_scope("local")
    if scope == "server" and not _request_is_admin():
        return jsonify({"error": "需要管理员权限"}), 403

    recipe = recipe_repo.update_recipe(
        recipe_id,
        user_id,
        data,
        scope="server" if scope == "server" else "local",
    )
    if not recipe:
        return jsonify({"error": "食谱不存在"}), 404
    if scope == "server":
        bump_global_recipe_library_version()
    else:
        bump_user_state_version(user_id)
    return jsonify({"recipe": _normalize_recipe_for_response(recipe)}), 200


@bp.route("/<int:recipe_id>", methods=["DELETE"])
@login_required
def delete_recipe(recipe_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    scope = _resolve_scope("local")
    if scope == "server" and not _request_is_admin():
        return jsonify({"error": "需要管理员权限"}), 403

    deleted = recipe_repo.delete_recipe(
        recipe_id,
        user_id,
        scope="server" if scope == "server" else "local",
    )
    if not deleted:
        return jsonify({"error": "食谱不存在"}), 404
    if scope == "server":
        bump_global_recipe_library_version()
    else:
        bump_user_state_version(user_id)
    return jsonify({"deleted": True}), 200
