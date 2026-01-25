"""用户健康档案接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.profile_repository import ProfileRepository
from backend.routes.auth import login_required
from backend.utils.request_context import get_request_user_id

bp = Blueprint("profile", __name__)
profile_repo = ProfileRepository()


@bp.route("", methods=["GET"])
@login_required
def get_profile():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    profile = profile_repo.get_profile(user_id)
    return jsonify({"profile": profile or {}}), 200


@bp.route("", methods=["PUT"])
@login_required
def update_profile():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    data = request.get_json(silent=True) or {}
    profile = profile_repo.upsert_profile(user_id, data)
    return jsonify({"profile": profile}), 200


@bp.route("/goals", methods=["GET"])
@login_required
def get_goals():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    goals = profile_repo.get_goals(user_id)
    return jsonify({"goals": goals or {}}), 200


@bp.route("/goals", methods=["PUT"])
@login_required
def update_goals():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    data = request.get_json(silent=True) or {}
    goals = profile_repo.upsert_goals(user_id, data)
    return jsonify({"goals": goals}), 200

