"""食谱与推荐接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.recipe_repository import RecipeRepository
from backend.routes.auth import login_required, admin_required

bp = Blueprint("recipes", __name__)
recipe_repo = RecipeRepository()


@bp.route("", methods=["GET"])
@login_required
def list_recipes():
    keyword = request.args.get("keyword")
    tag = request.args.get("tag")
    recipes = recipe_repo.list_recipes(keyword=keyword, tag=tag)
    return jsonify({"recipes": recipes}), 200


@bp.route("", methods=["POST"])
@admin_required
def create_recipe():
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name 必填"}), 400
    recipe = recipe_repo.create_recipe(data)
    return jsonify({"recipe": recipe}), 201


@bp.route("/<int:recipe_id>", methods=["PUT"])
@admin_required
def update_recipe(recipe_id: int):
    data = request.get_json(silent=True) or {}
    recipe = recipe_repo.update_recipe(recipe_id, data)
    if not recipe:
        return jsonify({"error": "食谱不存在"}), 404
    return jsonify({"recipe": recipe}), 200


@bp.route("/<int:recipe_id>", methods=["DELETE"])
@admin_required
def delete_recipe(recipe_id: int):
    deleted = recipe_repo.delete_recipe(recipe_id)
    if not deleted:
        return jsonify({"error": "食谱不存在"}), 404
    return jsonify({"deleted": True}), 200
