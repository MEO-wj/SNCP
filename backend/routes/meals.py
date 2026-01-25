"""饮食记录接口。"""

from __future__ import annotations

from datetime import datetime, date

from flask import Blueprint, jsonify, request

from backend.repository.meal_repository import MealRepository
from backend.routes.auth import login_required
from backend.utils.request_context import get_request_user_id

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
    meal_type = data.get("meal_type")
    if meal_type not in VALID_MEAL_TYPES:
        return jsonify({"error": "meal_type 不合法"}), 400

    eaten_at_raw = data.get("eaten_at")
    if eaten_at_raw:
        try:
            eaten_at = datetime.fromisoformat(eaten_at_raw)
        except ValueError:
            return jsonify({"error": "eaten_at 格式应为 ISO8601"}), 400
    else:
        eaten_at = datetime.now()

    items = data.get("items") or []
    if not isinstance(items, list):
        return jsonify({"error": "items 必须是数组"}), 400

    normalized_items = []
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

    meal_id = meal_repo.create_meal(
        user_id=user_id,
        meal_type=meal_type,
        eaten_at=eaten_at,
        note=data.get("note"),
        items=normalized_items,
    )
    return jsonify({"meal_id": meal_id}), 201


@bp.route("", methods=["GET"])
@login_required
def list_meals():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    day = _parse_date(request.args.get("date")) or date.today()
    meals = meal_repo.list_meals_by_date(user_id, day)
    return jsonify({"date": day.isoformat(), "meals": meals}), 200


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
    meals = meal_repo.list_meals_by_range(user_id, start, end)
    return jsonify({"start": start.isoformat(), "end": end.isoformat(), "meals": meals}), 200

