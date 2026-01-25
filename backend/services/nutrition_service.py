from __future__ import annotations

from typing import Any


def normalize_nutrition_value(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def sum_nutrition(items: list[dict[str, Any]]) -> dict[str, float]:
    totals = {
        "calories": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "carbs": 0.0,
        "fiber": 0.0,
        "sodium": 0.0,
        "sugar": 0.0,
    }
    for item in items:
        nutrition = item.get("nutrition") or {}
        weight_g = normalize_nutrition_value(item.get("weight_g")) or 0.0
        factor = weight_g / 100 if weight_g > 0 else 1.0
        for key in totals:
            totals[key] += normalize_nutrition_value(nutrition.get(key)) * factor
    return totals


def build_macro_ratio(totals: dict[str, float]) -> dict[str, float]:
    calories = totals.get("calories") or 0.0
    if calories <= 0:
        return {"protein": 0.0, "fat": 0.0, "carbs": 0.0}
    protein_cal = totals.get("protein", 0.0) * 4
    fat_cal = totals.get("fat", 0.0) * 9
    carbs_cal = totals.get("carbs", 0.0) * 4
    total_macro_cal = protein_cal + fat_cal + carbs_cal
    if total_macro_cal <= 0:
        return {"protein": 0.0, "fat": 0.0, "carbs": 0.0}
    return {
        "protein": round(protein_cal / total_macro_cal, 3),
        "fat": round(fat_cal / total_macro_cal, 3),
        "carbs": round(carbs_cal / total_macro_cal, 3),
    }


def default_goals() -> dict[str, int]:
    return {
        "calories_min": 1600,
        "calories_max": 2200,
        "protein_min": 50,
        "protein_max": 90,
        "fat_min": 40,
        "fat_max": 70,
        "carbs_min": 180,
        "carbs_max": 300,
        "sodium_max": 2000,
        "sugar_max": 50,
    }


def build_goal_checks(totals: dict[str, float], goals: dict[str, Any]) -> list[dict[str, Any]]:
    checks = []
    for key, label in [
        ("calories", "热量"),
        ("protein", "蛋白质"),
        ("fat", "脂肪"),
        ("carbs", "碳水"),
        ("sodium", "钠"),
        ("sugar", "糖"),
    ]:
        value = totals.get(key, 0.0)
        min_key = f"{key}_min"
        max_key = f"{key}_max"
        min_val = goals.get(min_key)
        max_val = goals.get(max_key)
        status = "ok"
        if min_val is not None and value < float(min_val):
            status = "low"
        if max_val is not None and value > float(max_val):
            status = "high"
        checks.append(
            {
                "name": label,
                "value": round(value, 1),
                "min": min_val,
                "max": max_val,
                "status": status,
            }
        )
    return checks


def build_health_warnings(
    items: list[dict[str, Any]], health_tags: list[str], rules: list[dict[str, Any]]
) -> list[str]:
    warnings = []
    if not health_tags or not rules:
        return warnings
    food_names = [str(item.get("food_name") or "") for item in items]
    for rule in rules:
        tag = rule.get("tag")
        if tag not in health_tags:
            continue
        forbidden = rule.get("forbidden_foods") or []
        for name in food_names:
            for keyword in forbidden:
                if keyword and keyword in name:
                    warnings.append(f"{tag}人群建议减少：{name}")
                    break
    return warnings


def build_suggestions(goal_checks: list[dict[str, Any]]) -> list[str]:
    suggestions = []
    for check in goal_checks:
        if check["status"] == "high":
            suggestions.append(f"{check['name']}偏高，建议适当减少。")
        elif check["status"] == "low":
            suggestions.append(f"{check['name']}偏低，建议适当补充。")
    return suggestions


__all__ = [
    "sum_nutrition",
    "build_macro_ratio",
    "default_goals",
    "build_goal_checks",
    "build_health_warnings",
    "build_suggestions",
]
