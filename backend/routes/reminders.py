"""提醒设置接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.reminder_repository import ReminderRepository
from backend.routes.auth import login_required
from backend.utils.request_context import get_request_user_id

bp = Blueprint("reminders", __name__)
reminder_repo = ReminderRepository()


@bp.route("", methods=["GET"])
@login_required
def list_reminders():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    reminders = reminder_repo.list_reminders(user_id)
    return jsonify({"reminders": reminders}), 200


@bp.route("", methods=["POST"])
@login_required
def create_reminder():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    data = request.get_json(silent=True) or {}
    if not data.get("reminder_type") or not data.get("time_of_day"):
        return jsonify({"error": "reminder_type 与 time_of_day 必填"}), 400
    reminder = reminder_repo.create_reminder(user_id, data)
    return jsonify({"reminder": reminder}), 201


@bp.route("/<int:reminder_id>", methods=["PUT"])
@login_required
def update_reminder(reminder_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    data = request.get_json(silent=True) or {}
    reminder = reminder_repo.update_reminder(reminder_id, data)
    if not reminder:
        return jsonify({"error": "提醒不存在"}), 404
    return jsonify({"reminder": reminder}), 200


@bp.route("/<int:reminder_id>", methods=["DELETE"])
@login_required
def delete_reminder(reminder_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400
    deleted = reminder_repo.delete_reminder(reminder_id)
    if not deleted:
        return jsonify({"error": "提醒不存在"}), 404
    return jsonify({"deleted": True}), 200
