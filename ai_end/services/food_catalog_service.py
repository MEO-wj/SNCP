from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from ai_end.data.food_catalog import FOOD_CATALOG, FOOD_CATEGORY_LABELS


def normalize_food_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", value.lower())


def _entry_aliases(entry: dict[str, Any]) -> list[str]:
    names = [entry.get("id") or "", entry.get("name") or "", *(entry.get("aliases") or [])]
    aliases: list[str] = []
    for name in names:
        normalized = normalize_food_text(str(name))
        if normalized and normalized not in aliases:
            aliases.append(normalized)
    return aliases


def get_catalog_prompt_lines() -> list[str]:
    lines: list[str] = []
    for entry in FOOD_CATALOG:
        alias_preview = ", ".join((entry.get("aliases") or [])[:4])
        lines.append(
            f'- {entry["id"]}: {entry["name"]} / {FOOD_CATEGORY_LABELS.get(entry["category"], entry["category"])}'
            f' / aliases: {alias_preview or entry["name"]} / default: {entry["default_weight_g"]}g'
        )
    return lines


def match_food_entry(value: str | None) -> dict[str, Any] | None:
    normalized = normalize_food_text(value)
    if not normalized:
        return None

    best_match: dict[str, Any] | None = None
    best_score = 0.0

    for entry in FOOD_CATALOG:
        aliases = _entry_aliases(entry)
        if normalized in aliases:
            return entry
        if any(alias and (alias in normalized or normalized in alias) for alias in aliases):
            return entry
        for alias in aliases:
            score = SequenceMatcher(None, normalized, alias).ratio()
            if score > best_score:
                best_match = entry
                best_score = score

    return best_match if best_score >= 0.62 else None


def build_catalog_meal_item(
    entry: dict[str, Any],
    *,
    weight_g: float | int | None = None,
    confidence: float | None = None,
    source: str = "catalog",
    display_name: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    resolved_weight = float(weight_g) if weight_g not in (None, "") else float(entry["default_weight_g"])
    resolved_weight = max(1.0, min(1200.0, resolved_weight))
    return {
        "name": entry["name"],
        "food_name": entry["name"],
        "canonical_name": entry["id"],
        "display_name": display_name or entry["name"],
        "category": entry["category"],
        "food_category": FOOD_CATEGORY_LABELS.get(entry["category"]),
        "weight_g": round(resolved_weight, 1),
        "confidence": round(float(confidence), 3) if confidence is not None else None,
        "source": source,
        "nutrition": entry["nutrition"],
        "matched": True,
        "notes": notes,
    }


def build_local_hint_matches(hint_text: str | None) -> list[dict[str, Any]]:
    normalized_hint = normalize_food_text(hint_text)
    if not normalized_hint:
        return []

    matches: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for entry in FOOD_CATALOG:
        if entry["id"] in seen_ids:
            continue
        aliases = _entry_aliases(entry)
        if any(alias and alias in normalized_hint for alias in aliases):
            matches.append(
                build_catalog_meal_item(
                    entry,
                    confidence=0.56,
                    source="local-hint",
                    display_name=entry["name"],
                    notes="通过提示词匹配得到，建议识别后手动确认份量。",
                )
            )
            seen_ids.add(entry["id"])

    if matches:
        return matches

    for raw_token in re.split(r"[\s,，、;；]+", hint_text or ""):
        entry = match_food_entry(raw_token)
        if entry and entry["id"] not in seen_ids:
            matches.append(
                build_catalog_meal_item(
                    entry,
                    confidence=0.42,
                    source="local-fuzzy",
                    display_name=raw_token.strip() or entry["name"],
                    notes="通过模糊匹配得到，建议手动核对。",
                )
            )
            seen_ids.add(entry["id"])

    return matches


__all__ = [
    "build_catalog_meal_item",
    "build_local_hint_matches",
    "get_catalog_prompt_lines",
    "match_food_entry",
    "normalize_food_text",
]
