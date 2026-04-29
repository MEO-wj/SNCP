"""管理员配置接口。"""

from __future__ import annotations

from uuid import UUID

from flask import Blueprint, jsonify, request

from backend.config import Config
from backend.repository.app_update_repository import AppUpdateRepository
from backend.repository.admin_dashboard_repository import AdminDashboardRepository
from backend.repository.health_rule_repository import HealthRuleRepository
from backend.repository.profile_repository import ProfileRepository
from backend.repository.user_repository import NotFoundError, UserRepository
from backend.routes.auth import admin_required, webmaster_required
from backend.services.app_update_service import AppUpdateService
from backend.utils.request_context import get_request_user_id
from backend.utils.timezone_context import resolve_request_tzinfo

bp = Blueprint("admin", __name__)
config = Config()
rule_repo = HealthRuleRepository()
dashboard_repo = AdminDashboardRepository()
profile_repo = ProfileRepository()
user_repo = UserRepository()
app_update_service = AppUpdateService(config, AppUpdateRepository())


def _user_role_labels(roles: list[str] | None) -> list[str]:
    labels: list[str] = []
    role_set = set(roles or [])
    if "webmaster" in role_set:
        labels.append("站长")
    if "admin" in role_set:
        labels.append("管理员")
    if not labels:
        labels.append("成员")
    return labels


@bp.route("/dashboard", methods=["GET"])
@admin_required
def get_dashboard():
    try:
        days = int(request.args.get("days") or 7)
    except (TypeError, ValueError):
        days = 7
    try:
        users_limit = int(request.args.get("users_limit") or 10)
    except (TypeError, ValueError):
        users_limit = 10
    snapshot = dashboard_repo.get_dashboard_snapshot(
        days=days,
        users_limit=users_limit,
        users_offset=0,
        request_tz=resolve_request_tzinfo(request),
    )
    return jsonify(snapshot), 200


@bp.route("/dashboard/users", methods=["GET"])
@admin_required
def get_dashboard_users():
    try:
        limit = int(request.args.get("limit") or 10)
    except (TypeError, ValueError):
        limit = 10
    try:
        offset = int(request.args.get("offset") or 0)
    except (TypeError, ValueError):
        offset = 0
    payload = dashboard_repo.get_dashboard_users(limit=limit, offset=offset)
    return jsonify(payload), 200


@bp.route("/users/<user_id>", methods=["GET"])
@admin_required
def get_admin_user_detail(user_id: str):
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        return jsonify({"error": "用户不存在"}), 404

    user = dashboard_repo.get_user_detail(target_user_id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404

    claims = getattr(request, "auth_claims", {}) or {}
    viewer_roles = claims.get("roles") or []
    target_roles = user.get("roles") or []
    can_promote_to_admin = (
        "webmaster" in set(viewer_roles)
        and "webmaster" not in set(target_roles)
        and "admin" not in set(target_roles)
    )
    can_revoke_admin = (
        "webmaster" in set(viewer_roles)
        and "webmaster" not in set(target_roles)
        and "admin" in set(target_roles)
    )

    return (
        jsonify(
            {
                "user": {
                    **user,
                    "role_labels": _user_role_labels(target_roles),
                },
                "profile": profile_repo.get_profile(target_user_id) or {},
                "goals": profile_repo.get_goals(target_user_id) or {},
                "permissions": {
                    "viewer_can_manage_roles": "webmaster" in set(viewer_roles),
                    "can_promote_to_admin": can_promote_to_admin,
                    "can_revoke_admin": can_revoke_admin,
                },
            }
        ),
        200,
    )


@bp.route("/users/<user_id>/promote-admin", methods=["PUT"])
@webmaster_required
def promote_admin_user(user_id: str):
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        return jsonify({"error": "用户不存在"}), 404

    try:
        user = user_repo.get_by_id(target_user_id)
    except NotFoundError:
        return jsonify({"error": "用户不存在"}), 404

    role_set = set(user.roles or [])
    if "webmaster" in role_set:
        return jsonify({"error": "站长账号无需设置为管理员"}), 400

    if "admin" not in role_set:
        user_repo.update_roles(user.id, list({*role_set, "admin"}))
        user = user_repo.get_by_id(user.id)

    return (
        jsonify(
            {
                "user": {
                    "id": str(user.id),
                    "roles": user.roles,
                    "role_labels": _user_role_labels(user.roles),
                },
                "message": "已设置为管理员",
            }
        ),
        200,
    )


@bp.route("/users/<user_id>/revoke-admin", methods=["PUT"])
@webmaster_required
def revoke_admin_user(user_id: str):
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        return jsonify({"error": "用户不存在"}), 404

    try:
        user = user_repo.get_by_id(target_user_id)
    except NotFoundError:
        return jsonify({"error": "用户不存在"}), 404

    role_set = set(user.roles or [])
    if "webmaster" in role_set:
        return jsonify({"error": "站长账号不可撤销管理员权限"}), 400

    if "admin" in role_set:
        next_roles = [role for role in user.roles if role != "admin"]
        user_repo.update_roles(user.id, next_roles)
        user = user_repo.get_by_id(user.id)

    return (
        jsonify(
            {
                "user": {
                    "id": str(user.id),
                    "roles": user.roles,
                    "role_labels": _user_role_labels(user.roles),
                },
                "message": "已撤销管理员权限",
            }
        ),
        200,
    )


@bp.route("/health_rules", methods=["GET"])
@admin_required
def list_health_rules():
    rules = rule_repo.list_rules()
    return jsonify({"rules": rules}), 200


@bp.route("/app-update", methods=["GET"])
@admin_required
def get_app_update_settings():
    return jsonify(app_update_service.get_admin_settings_payload(external_download_url=True)), 200


@bp.route("/app-update", methods=["PUT"])
@admin_required
def save_app_update_settings():
    data = request.get_json(silent=True) or {}
    try:
        payload = app_update_service.save_admin_settings(
            data,
            updated_by=get_request_user_id(request),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        return jsonify({"error": f"保存更新配置失败: {exc}"}), 500
    return jsonify(payload), 200


@bp.route("/health_rules", methods=["POST"])
@admin_required
def upsert_health_rule():
    data = request.get_json(silent=True) or {}
    tag = (data.get("tag") or "").strip()
    if not tag:
        return jsonify({"error": "tag 必填"}), 400
    rule = rule_repo.upsert_rule(tag, data.get("forbidden_foods") or [], data.get("tips") or [])
    return jsonify({"rule": rule}), 201


@bp.route("/health_rules/<int:rule_id>", methods=["DELETE"])
@admin_required
def delete_health_rule(rule_id: int):
    deleted = rule_repo.delete_rule(rule_id)
    if not deleted:
        return jsonify({"error": "规则不存在"}), 404
    return jsonify({"deleted": True}), 200
