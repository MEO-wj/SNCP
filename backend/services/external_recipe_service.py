from __future__ import annotations

import re
from typing import Any

import requests

from backend.config import Config


AREA_LABELS = {
    "American": "美式",
    "British": "英式",
    "Canadian": "加拿大",
    "Chinese": "中式",
    "Croatian": "克罗地亚",
    "Dutch": "荷兰",
    "Egyptian": "埃及",
    "Filipino": "菲律宾",
    "French": "法式",
    "Greek": "希腊",
    "Indian": "印度",
    "Irish": "爱尔兰",
    "Italian": "意式",
    "Jamaican": "牙买加",
    "Japanese": "日式",
    "Kenyan": "肯尼亚",
    "Malaysian": "马来西亚",
    "Mexican": "墨西哥",
    "Moroccan": "摩洛哥",
    "Polish": "波兰",
    "Portuguese": "葡萄牙",
    "Russian": "俄式",
    "Spanish": "西班牙",
    "Thai": "泰式",
    "Tunisian": "突尼斯",
    "Turkish": "土耳其",
    "Vietnamese": "越南",
}

CATEGORY_LABELS = {
    "Beef": "牛肉",
    "Breakfast": "早餐",
    "Chicken": "鸡肉",
    "Dessert": "甜点",
    "Goat": "羊肉",
    "Lamb": "羊肉",
    "Miscellaneous": "家常",
    "Pasta": "意面",
    "Pork": "猪肉",
    "Seafood": "海鲜",
    "Side": "配菜",
    "Starter": "开胃菜",
    "Vegan": "纯素",
    "Vegetarian": "素食",
}

TAG_LABELS = {
    "Alcoholic": "含酒精",
    "BBQ": "烧烤",
    "Breakfast": "早餐",
    "Bun": "面包",
    "Calorific": "高热量",
    "Casserole": "焗烤",
    "Chicken": "鸡肉",
    "Chocolate": "巧克力",
    "Christmas": "节日餐",
    "Curry": "咖喱",
    "Dairy": "乳制品",
    "DinnerParty": "聚餐",
    "Egg": "鸡蛋",
    "Fish": "鱼类",
    "HighFat": "高脂",
    "HighProtein": "高蛋白",
    "LowCalorie": "低热量",
    "MainMeal": "正餐",
    "Meat": "肉类",
    "Nutty": "坚果风味",
    "Pasta": "意面",
    "Pie": "派",
    "Pulse": "豆类",
    "Seafood": "海鲜",
    "SideDish": "配菜",
    "Soup": "汤品",
    "Speciality": "特色菜",
    "Spicy": "辛香",
    "Stew": "炖菜",
    "Vegetarian": "素食",
    "Vegan": "纯素",
}

INGREDIENT_LABELS = {
    "allspice": "多香果粉",
    "almonds": "杏仁",
    "aubergine": "茄子",
    "baby plum tomatoes": "小番茄",
    "bacon": "培根",
    "baking powder": "泡打粉",
    "basil": "罗勒",
    "basmati rice": "印度香米",
    "bay leaf": "月桂叶",
    "bay leaves": "月桂叶",
    "beef": "牛肉",
    "beef stock": "牛肉高汤",
    "black pepper": "黑胡椒",
    "breadcrumbs": "面包糠",
    "broccoli": "西兰花",
    "brown lentils": "棕扁豆",
    "butter": "黄油",
    "cabbage": "卷心菜",
    "carrots": "胡萝卜",
    "celery": "芹菜",
    "chicken": "鸡肉",
    "chicken breast": "鸡胸肉",
    "chicken stock": "鸡高汤",
    "chickpeas": "鹰嘴豆",
    "chilli": "辣椒",
    "chopped tomatoes": "番茄丁",
    "cinnamon": "肉桂",
    "coriander": "香菜",
    "coriander leaves": "香菜叶",
    "courgettes": "西葫芦",
    "cucumber": "黄瓜",
    "cumin": "孜然",
    "egg": "鸡蛋",
    "eggs": "鸡蛋",
    "feta": "菲达奶酪",
    "fish": "鱼肉",
    "flour": "面粉",
    "garlic": "蒜",
    "ginger": "姜",
    "green beans": "四季豆",
    "green chilli": "青辣椒",
    "green pepper": "青椒",
    "honey": "蜂蜜",
    "kale": "羽衣甘蓝",
    "lemon": "柠檬",
    "lemon juice": "柠檬汁",
    "lemon zest": "柠檬皮屑",
    "lentils": "扁豆",
    "lime": "青柠",
    "milk": "牛奶",
    "mint": "薄荷",
    "mushrooms": "蘑菇",
    "mustard": "芥末",
    "oil": "油",
    "olive oil": "橄榄油",
    "onion": "洋葱",
    "onions": "洋葱",
    "orange": "橙子",
    "paprika": "红椒粉",
    "parmesan": "帕玛森奶酪",
    "parsley": "欧芹",
    "pasta": "意面",
    "peas": "豌豆",
    "potatoes": "土豆",
    "red onions": "红洋葱",
    "red pepper": "红椒",
    "rice": "米饭",
    "salt": "盐",
    "soy sauce": "酱油",
    "spinach": "菠菜",
    "spring onions": "小葱",
    "sugar": "糖",
    "tahini": "芝麻酱",
    "thyme": "百里香",
    "tomato": "番茄",
    "tomatoes": "番茄",
    "vegetable stock": "蔬菜高汤",
    "white wine": "白葡萄酒",
    "yellow pepper": "黄椒",
    "yogurt": "酸奶",
}

TITLE_PHRASES = {
    "beef": "牛肉",
    "chicken": "鸡肉",
    "curry": "咖喱",
    "fish": "鱼",
    "lentils": "扁豆",
    "pasta": "意面",
    "rice": "米饭",
    "salad": "沙拉",
    "soup": "汤",
    "tahini": "芝麻酱",
    "vegetable": "蔬菜",
    "vegetables": "蔬菜",
}

MEASURE_LABELS = {
    "clove": "瓣",
    "cloves": "瓣",
    "cup": "杯",
    "cups": "杯",
    "g": "克",
    "kg": "千克",
    "ml": "毫升",
    "oz": "盎司",
    "pinch": "少许",
    "tbsp": "汤匙",
    "tbs": "汤匙",
    "tablespoon": "汤匙",
    "tablespoons": "汤匙",
    "tsp": "茶匙",
    "teaspoon": "茶匙",
    "teaspoons": "茶匙",
}


class ExternalRecipeService:
    """从社区食谱 API 拉取真实配图，同时把展示内容统一中文化。"""

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
        raw_name = str(meal.get("strMeal") or "").strip()
        category = str(meal.get("strCategory") or "").strip()
        area = str(meal.get("strArea") or "").strip()
        ingredients = self._extract_ingredients(meal)
        instructions = str(meal.get("strInstructions") or "").strip()
        steps = self._build_chinese_steps(instructions, ingredients)
        name = self._translate_recipe_name(raw_name, category=category, area=area, ingredients=ingredients)
        tags = self._build_tags(category, area, meal.get("strTags"))

        return {
            "id": f"themealdb-{meal.get('idMeal')}",
            "name": name,
            "original_name": raw_name,
            "cuisine": self._translate_label(area, AREA_LABELS) or self._translate_label(category, CATEGORY_LABELS) or "外部灵感",
            "tags": tags,
            "ingredients": ingredients,
            "steps": steps,
            "nutrition": {},
            "suitable_for": [],
            "cover_url": str(meal.get("strMealThumb") or "").strip() or None,
            "source_url": self._resolve_source_url(meal),
            "source_provider": "themealdb",
            "source": "external",
            "summary": self._build_summary(name, category=category, area=area),
        }

    @staticmethod
    def _extract_ingredients(meal: dict[str, Any]) -> list[dict[str, str]]:
        ingredients: list[dict[str, str]] = []
        for index in range(1, 21):
            name = str(meal.get(f"strIngredient{index}") or "").strip()
            amount = str(meal.get(f"strMeasure{index}") or "").strip()
            if not name:
                continue
            ingredients.append(
                {
                    "name": ExternalRecipeService._translate_ingredient_name(name, index=index),
                    "amount": ExternalRecipeService._translate_amount(amount),
                }
            )
        return ingredients

    @staticmethod
    def _split_steps(instructions: str) -> list[str]:
        if not instructions:
            return []

        normalized = instructions.replace("\r", "\n")
        lines = [line.strip(" \t-*•") for line in normalized.split("\n") if line.strip()]
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
        for value, labels in [(category, CATEGORY_LABELS), (area, AREA_LABELS)]:
            text = ExternalRecipeService._translate_label(value, labels)
            if text and text not in tags:
                tags.append(text)

        if raw_tags:
            for tag in str(raw_tags).split(","):
                cleaned = ExternalRecipeService._translate_label(tag.strip(), TAG_LABELS)
                if cleaned and cleaned not in tags:
                    tags.append(cleaned)

        return tags[:6]

    @staticmethod
    def _build_summary(name: str, *, category: str, area: str) -> str:
        labels = [
            label
            for label in [
                ExternalRecipeService._translate_label(area, AREA_LABELS),
                ExternalRecipeService._translate_label(category, CATEGORY_LABELS),
            ]
            if label
        ]
        if labels:
            return f"{name} 来自外部食谱灵感，风味偏向{' / '.join(labels)}，可按少油少盐思路调整。"
        return f"{name} 来自外部食谱灵感，可作为本地菜谱之外的新选择。"

    @staticmethod
    def _build_chinese_steps(instructions: str, ingredients: list[dict[str, str]]) -> list[str]:
        raw_steps = ExternalRecipeService._split_steps(instructions)
        if raw_steps and not any(ExternalRecipeService._contains_latin(step) for step in raw_steps):
            return raw_steps[:8]

        main_ingredients = [item["name"] for item in ingredients[:4] if item.get("name")]
        prep_target = "、".join(main_ingredients) if main_ingredients else "主要食材"
        return [
            f"准备好{prep_target}，清洗并切成适合入口的大小。",
            "锅中用少量油加热香料或配菜，再加入主要食材翻炒或炖煮。",
            "根据食材熟度补少量清水或高汤，保持中小火至口感软熟。",
            "出锅前少量调味，优先控制盐和油的用量。",
        ]

    @staticmethod
    def _translate_recipe_name(
        raw_name: str,
        *,
        category: str,
        area: str,
        ingredients: list[dict[str, str]],
    ) -> str:
        words = re.findall(r"[A-Za-z]+", raw_name.lower())
        translated_parts: list[str] = []
        for word in words:
            translated = TITLE_PHRASES.get(word) or INGREDIENT_LABELS.get(word)
            if translated and translated not in translated_parts:
                translated_parts.append(translated)

        if translated_parts:
            area_label = ExternalRecipeService._translate_label(area, AREA_LABELS)
            prefix = area_label if area_label and area_label not in translated_parts else ""
            return f"{prefix}{''.join(translated_parts[:3])}".strip() or "外部灵感食谱"

        main_ingredient = next((item.get("name") for item in ingredients if item.get("name")), "")
        area_label = ExternalRecipeService._translate_label(area, AREA_LABELS)
        category_label = ExternalRecipeService._translate_label(category, CATEGORY_LABELS)
        name = "".join(part for part in [area_label, main_ingredient, category_label] if part)
        return name or "外部灵感食谱"

    @staticmethod
    def _translate_ingredient_name(name: str, *, index: int) -> str:
        normalized = re.sub(r"\s+", " ", name.strip().lower())
        translated = INGREDIENT_LABELS.get(normalized)
        if translated:
            return translated
        singular = normalized[:-1] if normalized.endswith("s") else normalized
        translated = INGREDIENT_LABELS.get(singular)
        if translated:
            return translated
        return f"外部食材{index}" if ExternalRecipeService._contains_latin(name) else name

    @staticmethod
    def _translate_amount(amount: str) -> str:
        text = re.sub(r"\s+", " ", amount.strip())
        if not text:
            return ""
        text = re.sub(r"(\d+(?:\.\d+)?)\s*kg\b", r"\1千克", text, flags=re.IGNORECASE)
        text = re.sub(r"(\d+(?:\.\d+)?)\s*g\b", r"\1克", text, flags=re.IGNORECASE)
        text = re.sub(r"(\d+(?:\.\d+)?)\s*ml\b", r"\1毫升", text, flags=re.IGNORECASE)
        text = re.sub(r"and juice of (\d+)", r"\1个，取汁", text, flags=re.IGNORECASE)
        text = re.sub(r"juice of (\d+)", r"\1个，取汁", text, flags=re.IGNORECASE)
        for source, target in sorted(MEASURE_LABELS.items(), key=lambda item: len(item[0]), reverse=True):
            text = re.sub(rf"\b{re.escape(source)}\b", target, text, flags=re.IGNORECASE)
        replacements = {
            " chopped": "，切碎",
            " sliced": "，切片",
            " peeled": "，去皮",
            " crushed": "，压碎",
            " shredded": "，切丝",
            "thinly": "薄",
        }
        for source, target in replacements.items():
            text = text.replace(source, target)
        return "" if ExternalRecipeService._contains_latin(text) else text

    @staticmethod
    def _translate_label(value: Any, labels: dict[str, str]) -> str:
        text = str(value or "").strip()
        if not text:
            return ""
        translated = labels.get(text) or labels.get(text.replace(" ", "")) or labels.get(text.title())
        if translated:
            return translated
        return "" if ExternalRecipeService._contains_latin(text) else text

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

    @staticmethod
    def _contains_latin(value: str) -> bool:
        return bool(re.search(r"[A-Za-z]", value or ""))


__all__ = ["ExternalRecipeService"]
