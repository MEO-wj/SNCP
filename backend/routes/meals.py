from __future__ import annotations

from datetime import date, datetime, timezone

from flask import Blueprint, jsonify, request

from backend.repository.meal_repository import MealRepository
from backend.routes.auth import login_required
from backend.services.cache_service import bump_user_state_version
from backend.utils.request_context import get_request_user_id
from backend.utils.timezone_context import (
    get_request_local_date,
    local_date_span_to_utc_range,
    local_day_to_utc_range,
    resolve_request_tzinfo,
)

bp = Blueprint("meals", __name__)

meal_repo = MealRepository()

VALID_MEAL_TYPES = {"breakfast", "lunch", "dinner", "snack"}


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


@bp.route("", methods=["POST"])
@login_required
def create_meal():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    data = request.get_json(silent=True) or {}
    request_tz = resolve_request_tzinfo(request)
    meal_type = data.get("meal_type")
    if meal_type not in VALID_MEAL_TYPES:
        return jsonify({"error": "meal_type 不合法"}), 400

    eaten_at_raw = data.get("eaten_at")
    if eaten_at_raw:
        try:
            eaten_at = datetime.fromisoformat(eaten_at_raw)
        except ValueError:
            return jsonify({"error": "eaten_at 格式应为 ISO8601"}), 400
        if eaten_at.tzinfo is None:
            eaten_at = eaten_at.replace(tzinfo=request_tz)
    else:
        eaten_at = datetime.now(request_tz)
    eaten_at = eaten_at.astimezone(timezone.utc)

    client_request_id = data.get("client_request_id")
    if client_request_id is not None and not isinstance(client_request_id, str):
        return jsonify({"error": "client_request_id 必须为字符串"}), 400
    client_request_id = (client_request_id or "").strip() or None

    items = data.get("items") or []
    if not isinstance(items, list):
        return jsonify({"error": "items 必须是数组"}), 400

    normalized_items: list[dict[str, object]] = []
    for item in items:
        normalized_items.append(
            {
                "food_name": item.get("food_name"),
                "food_category": item.get("food_category"),
                "weight_g": item.get("weight_g"),
                "source": item.get("source"),
                "nutrition": item.get("nutrition") or {},
            }
        )

    meal_id, created = meal_repo.create_meal(
        user_id=user_id,
        meal_type=meal_type,
        eaten_at=eaten_at,
        client_request_id=client_request_id,
        note=data.get("note"),
        items=normalized_items,
    )
    bump_user_state_version(user_id)
    return jsonify({"meal_id": meal_id, "created": created}), 201 if created else 200


@bp.route("", methods=["GET"])
@login_required
def list_meals():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    request_tz = resolve_request_tzinfo(request)
    day = _parse_date(request.args.get("date")) or get_request_local_date(request)
    start_utc, end_utc = local_day_to_utc_range(day, request_tz)
    meals = meal_repo.list_meals_by_date(user_id, start_utc, end_utc)
    return jsonify({"date": day.isoformat(), "meals": meals}), 200


@bp.route("/<int:meal_id>", methods=["DELETE"])
@login_required
def delete_meal(meal_id: int):
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    deleted = meal_repo.delete_meal(user_id, meal_id)
    if not deleted:
        return jsonify({"error": "餐次不存在"}), 404
    bump_user_state_version(user_id)
    return ("", 204)


@bp.route("/range", methods=["GET"])
@login_required
def list_meals_range():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    start = _parse_date(request.args.get("start"))
    end = _parse_date(request.args.get("end"))
    if not start or not end:
        return jsonify({"error": "start/end 参数必填，格式为 YYYY-MM-DD"}), 400
    request_tz = resolve_request_tzinfo(request)
    start_utc, end_utc = local_date_span_to_utc_range(start, end, request_tz)

    meals = meal_repo.list_meals_by_range(user_id, start_utc, end_utc)
    return jsonify({"start": start.isoformat(), "end": end.isoformat(), "meals": meals}), 200
