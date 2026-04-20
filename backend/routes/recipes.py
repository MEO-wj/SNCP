"""食谱接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.recipe_repository import RecipeRepository
from backend.routes.auth import login_required
from backend.utils.request_context import get_request_user_id

bp = Blueprint("recipes", __name__)
recipe_repo = RecipeRepository()


@bp.route("", methods=["GET"])
@login_required
def list_recipes():
    keyword = request.args.get("keyword")
    tag = request.args.get("tag")
    user_id = get_request_user_id(request)
    recipes = recipe_repo.list_recipes(user_id=user_id, keyword=keyword, tag=tag)
    return jsonify({"recipes": recipes}), 200


@bp.route("", methods=["POST"])
@login_required
def create_recipe():
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name 必填"}), 400

    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    recipe, created = recipe_repo.create_recipe(user_id, data)
    return jsonify({"recipe": recipe, "created": created}), 201 if created else 200


@bp.route("/<int:recipe_id>", methods=["PUT"])
@login_required
def update_recipe(recipe_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    data = request.get_json(silent=True) or {}
    recipe = recipe_repo.update_recipe(recipe_id, user_id, data)
    if not recipe:
        return jsonify({"error": "食谱不存在"}), 404
    return jsonify({"recipe": recipe}), 200


@bp.route("/<int:recipe_id>", methods=["DELETE"])
@login_required
def delete_recipe(recipe_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    deleted = recipe_repo.delete_recipe(recipe_id, user_id)
    if not deleted:
        return jsonify({"error": "食谱不存在"}), 404
    return jsonify({"deleted": True}), 200
