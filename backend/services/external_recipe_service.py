from __future__ import annotations

import re
from typing import Any

import requests

from backend.config import Config


class ExternalRecipeService:
    """从官方社区菜谱 API 拉取真实菜谱与封面图。"""

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()

    def list_candidates(
        self,
        *,
        keyword: str | None,
        limit: int = 8,
        exclude_names: list[str] | None = None,
        refresh_round: int = 0,
    ) -> list[dict[str, Any]]:
        normalized_excluded = {self._normalize_name(name) for name in (exclude_names or []) if name}

        meals: list[dict[str, Any]]
        if (keyword or "").strip():
            meals = self._search_meals_by_name(keyword.strip())
            if not meals:
                meals = self._random_meals(count=min(max(limit, 4), 8))
        else:
            meals = self._random_meals(count=min(max(limit, 4), 8))

        mapped: list[dict[str, Any]] = []
        seen_names: set[str] = set()
        for meal in meals:
            recipe = self._map_meal(meal)
            normalized_name = self._normalize_name(recipe.get("name"))
            if not normalized_name or normalized_name in seen_names or normalized_name in normalized_excluded:
                continue
            seen_names.add(normalized_name)
            mapped.append(recipe)

        if refresh_round > 0 and len(mapped) > 1:
            offset = refresh_round % len(mapped)
            if offset:
                mapped = mapped[offset:] + mapped[:offset]

        return mapped[:limit]

    def _search_meals_by_name(self, keyword: str) -> list[dict[str, Any]]:
        data = self._request_json("search.php", {"s": keyword})
        meals = data.get("meals")
        return meals if isinstance(meals, list) else []

    def _random_meals(self, *, count: int) -> list[dict[str, Any]]:
        meals: list[dict[str, Any]] = []
        for _ in range(max(1, count)):
            data = self._request_json("random.php")
            batch = data.get("meals")
            if isinstance(batch, list):
                meals.extend(batch)
        return meals

    def _request_json(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        base_url = self.config.themealdb_base_url.rstrip("/")
        api_key = self.config.themealdb_api_key.strip()
        url = f"{base_url}/json/v1/{api_key}/{endpoint}"
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else {}

    def _map_meal(self, meal: dict[str, Any]) -> dict[str, Any]:
        name = str(meal.get("strMeal") or "").strip() or "外部菜谱"
        category = str(meal.get("strCategory") or "").strip()
        area = str(meal.get("strArea") or "").strip()
        tags = self._build_tags(category, area, meal.get("strTags"))
        ingredients = self._extract_ingredients(meal)
        instructions = str(meal.get("strInstructions") or "").strip()
        steps = self._split_steps(instructions)

        return {
            "id": f"themealdb-{meal.get('idMeal')}",
            "name": name,
            "cuisine": area or category or "外部菜谱",
            "tags": tags,
            "ingredients": ingredients,
            "steps": steps,
            "nutrition": {},
            "suitable_for": [],
            "cover_url": str(meal.get("strMealThumb") or "").strip() or None,
            "source_url": self._resolve_source_url(meal),
            "source_provider": "themealdb",
            "source": "external",
            "summary": self._build_summary(name, category=category, area=area, steps=steps),
        }

    @staticmethod
    def _extract_ingredients(meal: dict[str, Any]) -> list[dict[str, str]]:
        ingredients: list[dict[str, str]] = []
        for index in range(1, 21):
            name = str(meal.get(f"strIngredient{index}") or "").strip()
            amount = str(meal.get(f"strMeasure{index}") or "").strip()
            if not name:
                continue
            ingredients.append({"name": name, "amount": amount or ""})
        return ingredients

    @staticmethod
    def _split_steps(instructions: str) -> list[str]:
        if not instructions:
            return []

        normalized = instructions.replace("\r", "\n")
        lines = [line.strip(" \t-•") for line in normalized.split("\n") if line.strip()]
        if len(lines) >= 2:
            return lines

        sentences = [
            part.strip()
            for part in re.split(r"(?<=[.!?。！？])\s+", normalized)
            if part.strip()
        ]
        return sentences or [normalized.strip()]

    @staticmethod
    def _build_tags(category: str, area: str, raw_tags: Any) -> list[str]:
        tags: list[str] = []
        for value in [category, area]:
            text = str(value or "").strip()
            if text and text not in tags:
                tags.append(text)

        if raw_tags:
            for tag in str(raw_tags).split(","):
                cleaned = tag.strip()
                if cleaned and cleaned not in tags:
                    tags.append(cleaned)

        return tags[:6]

    @staticmethod
    def _build_summary(name: str, *, category: str, area: str, steps: list[str]) -> str:
        if steps:
            return steps[0]

        labels = [part for part in [area, category] if part]
        if labels:
            return f"{name} 来自外部食谱源，风味偏向{' / '.join(labels)}。"
        return f"{name} 来自外部食谱源，可作为新的候选菜谱。"

    @staticmethod
    def _resolve_source_url(meal: dict[str, Any]) -> str | None:
        for key in ("strSource", "strYoutube"):
            value = str(meal.get(key) or "").strip()
            if value:
                return value
        return None

    @staticmethod
    def _normalize_name(value: Any) -> str:
        return "".join(str(value or "").strip().lower().split())


__all__ = ["ExternalRecipeService"]
