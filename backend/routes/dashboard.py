"""健康看板接口。"""

from __future__ import annotations

from datetime import date
from typing import Any

from flask import Blueprint, jsonify, request

from backend.repository.meal_repository import MealRepository
from backend.repository.profile_repository import ProfileRepository
from backend.repository.health_rule_repository import HealthRuleRepository
from backend.routes.auth import login_required
from backend.services.nutrition_service import (
    build_goal_checks,
    build_health_warnings,
    build_macro_ratio,
    build_suggestions,
    default_goals,
    sum_nutrition,
)
from backend.utils.request_context import get_request_user_id

bp = Blueprint("dashboard", __name__)

meal_repo = MealRepository()
profile_repo = ProfileRepository()
rule_repo = HealthRuleRepository()


@bp.route("/today", methods=["GET"])
@login_required
def today_dashboard():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    day = date.today()
    meals = meal_repo.list_meals_by_date(user_id, day)
    items = []
    for meal in meals:
        items.extend(meal.get("items") or [])

    profile = profile_repo.get_profile(user_id) or {}
    goals = profile_repo.get_goals(user_id) or default_goals()
    rules = rule_repo.list_rules()
    health_tags = profile.get("chronic_conditions") or []

    totals = sum_nutrition(items)
    macro_ratio = build_macro_ratio(totals)
    goal_checks = build_goal_checks(totals, goals)
    warnings = build_health_warnings(items, health_tags, rules)
    suggestions = build_suggestions(goal_checks)

    score = 100
    for check in goal_checks:
        if check["status"] == "high":
            score -= 10
        elif check["status"] == "low":
            score -= 6
    score = max(0, min(score, 100))

    return (
        jsonify(
            {
                "date": day.isoformat(),
                "meal_count": len(meals),
                "totals": totals,
                "macro_ratio": macro_ratio,
                "goal_checks": goal_checks,
                "warnings": warnings,
                "suggestions": suggestions,
                "score": score,
            }
        ),
        200,
    )


@bp.route("/trend", methods=["GET"])
@login_required
def nutrition_trend():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    try:
        days = int(request.args.get("days", 30))
    except ValueError:
        return jsonify({"error": "days 参数应为整数"}), 400
    days = max(7, min(days, 90))
    end = date.today()
    start = end.fromordinal(end.toordinal() - (days - 1))

    items = meal_repo.get_meal_items_by_range(user_id, start, end)
    summaries: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        day_key = item.get("eaten_at").date().isoformat()
        summaries.setdefault(day_key, []).append(item)

    trend = []
    for offset in range(days):
        current = start.fromordinal(start.toordinal() + offset)
        day_key = current.isoformat()
        day_items = summaries.get(day_key, [])
        totals = sum_nutrition(day_items)
        trend.append({"date": day_key, "totals": totals})

    return jsonify({"start": start.isoformat(), "end": end.isoformat(), "trend": trend}), 200

