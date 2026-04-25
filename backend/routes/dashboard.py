"""健康看板接口。"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from ai_end.services.ai_service import AIService
from backend.repository.meal_repository import MealRepository
from backend.repository.profile_repository import ProfileRepository
from backend.repository.health_rule_repository import HealthRuleRepository
from backend.routes.auth import login_required
from backend.services.cache_service import (
    get_dashboard_today_cache,
    get_user_state_version,
    set_dashboard_today_cache,
)
from backend.services.nutrition_service import (
    build_goal_checks,
    build_health_warnings,
    build_macro_ratio,
    build_suggestions,
    compute_rule_score,
    default_goals,
    sum_nutrition,
)
from backend.utils.request_context import get_request_user_id
from backend.utils.timezone_context import (
    get_request_local_date,
    get_request_timezone_cache_key,
    local_date_span_to_utc_range,
    local_day_to_utc_range,
    resolve_request_tzinfo,
    to_local_date,
)

bp = Blueprint("dashboard", __name__)

meal_repo = MealRepository()
profile_repo = ProfileRepository()
rule_repo = HealthRuleRepository()
ai_service = AIService()


@bp.route("/today", methods=["GET"])
@login_required
def today_dashboard():
    user_id = get_request_user_id(request)
    if not user_id:
        return jsonify({"error": "用户信息缺失"}), 400

    request_tz = resolve_request_tzinfo(request)
    day = get_request_local_date(request)
    day_cache_key = f"{day.isoformat()}@{get_request_timezone_cache_key(request)}"
    day_start_utc, day_end_utc = local_day_to_utc_range(day, request_tz)
    state_version = get_user_state_version(user_id)
    cached_payload = get_dashboard_today_cache(user_id, day_cache_key, state_version)
    if cached_payload is not None:
        return jsonify(cached_payload), 200

    meals = meal_repo.list_meals_by_date(user_id, day_start_utc, day_end_utc)
    items = []
    for meal in meals:
        items.extend(meal.get("items") or [])

    if not items:
        empty_totals = sum_nutrition([])
        payload = {
            "date": day.isoformat(),
            "meal_count": 0,
            "totals": empty_totals,
            "macro_ratio": build_macro_ratio(empty_totals),
            "goal_checks": [],
            "warnings": ["今日尚未记录餐次，请先记录早餐、午餐或晚餐。"],
            "suggestions": [],
            "score": 0,
            "score_breakdown": {
                "rule_score": 0,
                "ai_score": 0,
                "rule_weight": 0,
                "ai_weight": 0,
            },
            "ai": {
                "provider": "local",
                "score": 0,
                "summary": "",
                "strengths": [],
                "risks": [],
                "next_actions": [],
            },
        }
        set_dashboard_today_cache(user_id, day_cache_key, state_version, payload)
        return jsonify(payload), 200

    profile = profile_repo.get_profile(user_id) or {}
    goals = profile_repo.get_goals(user_id) or default_goals()
    rules = rule_repo.list_rules()
    health_tags = profile.get("chronic_conditions") or []

    totals = sum_nutrition(items)
    macro_ratio = build_macro_ratio(totals)
    goal_checks = build_goal_checks(totals, goals)
    rule_warnings = build_health_warnings(items, health_tags, rules)
    rule_suggestions = build_suggestions(goal_checks)
    rule_score = compute_rule_score(goal_checks)

    ai_payload = {
        "date": day.isoformat(),
        "items": items,
        "profile": profile or {},
        "goals": goals,
        "totals": totals,
        "macro_ratio": macro_ratio,
        "goal_checks": goal_checks,
        "warnings": rule_warnings,
        "suggestions": rule_suggestions,
        "rule_score": rule_score,
    }
    try:
        ai_result = ai_service.analyze_nutrition(ai_payload)
    except Exception:
        ai_result = {
            "provider": "local",
            "analysis": {
                "score": rule_score,
                "summary": "",
                "strengths": [],
                "risks": [],
                "next_actions": rule_suggestions,
            },
        }

    ai_analysis = ai_result.get("analysis") or {}
    ai_provider = ai_result.get("provider") or "local"
    ai_score = _coerce_score(ai_analysis.get("score"), default=rule_score)
    score = max(0, min(round(rule_score * 0.4 + ai_score * 0.6), 100))
    warnings = _merge_texts(ai_analysis.get("risks"), rule_warnings)
    suggestions = _merge_texts(ai_analysis.get("next_actions"), rule_suggestions)

    payload = {
        "date": day.isoformat(),
        "meal_count": len(meals),
        "totals": totals,
        "macro_ratio": macro_ratio,
        "goal_checks": goal_checks,
        "warnings": warnings,
        "suggestions": suggestions,
        "score": score,
        "score_breakdown": {
            "rule_score": rule_score,
            "ai_score": ai_score,
            "rule_weight": 0.4,
            "ai_weight": 0.6,
        },
        "ai": {
            "provider": ai_provider,
            "score": ai_score,
            "summary": ai_analysis.get("summary") or "",
            "strengths": ai_analysis.get("strengths") or [],
            "risks": ai_analysis.get("risks") or [],
            "next_actions": ai_analysis.get("next_actions") or [],
        },
    }
    set_dashboard_today_cache(user_id, day_cache_key, state_version, payload)
    return jsonify(payload), 200


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
    request_tz = resolve_request_tzinfo(request)
    end = get_request_local_date(request)
    start = end.fromordinal(end.toordinal() - (days - 1))
    start_utc, end_utc = local_date_span_to_utc_range(start, end, request_tz)

    items = meal_repo.get_meal_items_by_range(user_id, start_utc, end_utc)
    summaries: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        eaten_at = item.get("eaten_at")
        if eaten_at is None:
            continue
        day_key = to_local_date(eaten_at, request_tz).isoformat()
        summaries.setdefault(day_key, []).append(item)

    trend = []
    for offset in range(days):
        current = start.fromordinal(start.toordinal() + offset)
        day_key = current.isoformat()
        day_items = summaries.get(day_key, [])
        totals = sum_nutrition(day_items)
        trend.append({"date": day_key, "totals": totals})

    return jsonify({"start": start.isoformat(), "end": end.isoformat(), "trend": trend}), 200


def _coerce_score(value: Any, default: int) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = default
    return max(0, min(score, 100))


def _merge_texts(primary: Any, secondary: Any, limit: int = 4) -> list[str]:
    merged: list[str] = []
    for source in (primary, secondary):
        if not isinstance(source, list):
            continue
        for item in source:
            text = str(item or "").strip()
            if text and text not in merged:
                merged.append(text)
            if len(merged) >= limit:
                return merged
    return merged
