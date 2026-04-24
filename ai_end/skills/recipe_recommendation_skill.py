from __future__ import annotations

import json
from textwrap import dedent
from typing import Any


RECIPE_RECOMMENDATION_SKILL_NAME = "服务器食谱库推荐技能"

MAX_MODEL_RECIPE_CANDIDATES = 12

RECIPE_RECOMMENDATION_SKILL_SPEC = dedent(
    """
    你是健康食谱推荐助手。当前产品策略是“只从服务器已有食谱库中搜索和推荐”，暂时不引入外部食谱，也不生成新食谱。

    硬性边界：
    1. 只能从 payload.recipes 中选择食谱，source 必须返回 library。
    2. 禁止推荐外部食谱，禁止返回 source=external。
    3. 禁止生成新食谱，禁止返回 source=generated。
    4. 禁止虚构 payload.recipes 中不存在的菜名、食材、步骤或配图。
    5. 不需要提供“加入食谱库”语义，因为所有推荐都已经来自服务器食谱库。
    6. 所有面向用户展示的内容必须是简体中文。

    选择规则：
    1. 结合 profile.chronic_conditions、allergies、taste_preferences、goals 和 rules 判断适配性。
    2. 对过敏和禁忌信息严格回避；如果食谱食材命中过敏项，不要推荐。
    3. 如果 keyword 或 tag 存在，优先选择名称、标签、适宜人群、食材与搜索意图相关的服务器食谱。
    4. 最多返回 4 个食谱；如果服务器食谱库没有合适结果，可以返回空 items，不要补外部或生成内容。
    5. reason 必须说明为什么适合这个用户，不能只写“营养均衡”。

    输出要求：
    - 只返回 JSON 对象，不要 markdown，不要解释文本。
    - 返回结构必须是 {"items":[...]}。
    - 每个 item 至少包含 name、summary、reason、source、tags、suitable_for。
    - 若候选里存在 recipe_id、cover_url、source_url、source_provider、ingredients、steps、nutrition，应保留。
    """
).strip()


def _compact_payload_for_model(payload: dict[str, Any]) -> dict[str, Any]:
    recipes = payload.get("recipes") or []
    return {
        "profile": payload.get("profile") or {},
        "goals": payload.get("goals") or {},
        "rules": payload.get("rules") or [],
        "context": payload.get("context") or {},
        "recipes": [_compact_recipe_for_model(recipe) for recipe in recipes[:MAX_MODEL_RECIPE_CANDIDATES]],
    }


def _compact_recipe_for_model(recipe: dict[str, Any]) -> dict[str, Any]:
    nutrition = recipe.get("nutrition") or {}
    return {
        "recipe_id": recipe.get("recipe_id") or recipe.get("id"),
        "name": recipe.get("name"),
        "cuisine": recipe.get("cuisine"),
        "tags": recipe.get("tags") or [],
        "suitable_for": recipe.get("suitable_for") or [],
        "nutrition": {
            "calories": nutrition.get("calories"),
            "protein": nutrition.get("protein"),
            "fat": nutrition.get("fat"),
            "carbs": nutrition.get("carbs"),
            "sodium": nutrition.get("sodium"),
            "sugar": nutrition.get("sugar"),
        },
        "summary": recipe.get("summary") or "",
    }


def build_recipe_recommendation_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    model_payload = _compact_payload_for_model(payload)
    visible_recipes = model_payload.get("recipes") or []
    recipe_names = [
        str(item.get("name") or "").strip()
        for item in visible_recipes
        if item.get("name")
    ]
    recipe_preview = ", ".join(recipe_names[:MAX_MODEL_RECIPE_CANDIDATES]) if recipe_names else "none"
    context = model_payload.get("context") or {}
    exclude_names = [str(item).strip() for item in (context.get("exclude_names") or []) if str(item).strip()]
    exclude_preview = ", ".join(exclude_names[:12]) if exclude_names else "none"

    user_prompt = (
        "请只从服务器已有食谱库 payload.recipes 中推荐最多 4 个食谱。\n"
        f"服务器食谱候选预览：{recipe_preview}\n"
        f"尽量避免重复推荐：{exclude_preview}\n"
        "如果候选不足或不适合，可以返回空 items；不要使用外部食谱，不要生成新食谱。\n"
        "返回格式必须是 JSON 对象，结构如下：\n"
        '{"items":[{"recipe_id":null,"name":"","summary":"","reason":"","source":"library","tags":[""],"suitable_for":[""]}]}\n'
        "Payload:\n"
        f"{json.dumps(model_payload, ensure_ascii=False)}"
    )

    return [
        {
            "role": "system",
            "content": (
                f"你是{RECIPE_RECOMMENDATION_SKILL_NAME}。"
                "严格遵守只推荐服务器已有食谱库的策略，并只返回 JSON 对象。\n"
                f"{RECIPE_RECOMMENDATION_SKILL_SPEC}"
            ),
        },
        {"role": "user", "content": user_prompt},
    ]


def build_recipe_recommendation_schema() -> dict[str, Any]:
    return {
        "name": "recipe_recommendations",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "maxItems": 4,
                    "items": {
                        "type": "object",
                        "properties": {
                            "recipe_id": {"type": ["integer", "null"]},
                            "name": {"type": "string"},
                            "summary": {"type": "string"},
                            "reason": {"type": "string"},
                            "source": {"type": "string", "enum": ["library"]},
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "suitable_for": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": [
                            "recipe_id",
                            "name",
                            "summary",
                            "reason",
                            "source",
                            "tags",
                            "suitable_for",
                        ],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["items"],
            "additionalProperties": False,
        },
    }


__all__ = [
    "RECIPE_RECOMMENDATION_SKILL_NAME",
    "RECIPE_RECOMMENDATION_SKILL_SPEC",
    "build_recipe_recommendation_messages",
    "build_recipe_recommendation_schema",
]
