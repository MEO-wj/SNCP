"""管理员配置接口。"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.repository.health_rule_repository import HealthRuleRepository
from backend.routes.auth import admin_required

bp = Blueprint("admin", __name__)
rule_repo = HealthRuleRepository()


@bp.route("/health_rules", methods=["GET"])
@admin_required
def list_health_rules():
    rules = rule_repo.list_rules()
    return jsonify({"rules": rules}), 200


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
