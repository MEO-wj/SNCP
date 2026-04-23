from __future__ import annotations

import json
from textwrap import dedent
from typing import Any


RECIPE_RECOMMENDATION_SKILL_NAME = "健康食谱推荐技能"

RECIPE_RECOMMENDATION_SKILL_SPEC = dedent(
    """
    你是面向中老年人、慢病人群和家庭饮食管理场景的健康食谱推荐助手。你的目标不是推荐看起来高级的菜，而是给出安全、可执行、和用户健康目标匹配的食谱。

    推荐优先级：
    1. 不要全部推荐本地食谱；当存在安全可用的外部候选食谱时，最多 4 条推荐中至少应包含 1 条 source=external 的新食谱。
    2. 当 payload.context.prefer_external 为 true 时，优先推荐 2 条外部候选食谱，其余位置再放本地食谱。
    3. 本地食谱用于保证健康适配和稳定性，外部食谱用于提供新鲜感、真实来源和配图。
    4. 如果推荐 4 条，目标结构是 2 条本地食谱 + 1 到 2 条外部食谱；如果本地食谱明显不足，可增加外部食谱。
    5. 只有本地和外部候选都不适合时，才允许生成新食谱，并将 source 设为 generated。
    6. payload.context.exclude_names 中的食谱应尽量避开，除非没有更合理替代。
    7. 外部候选食谱必须保留原始 name、cover_url、source_url、source_provider 和 source=external，便于前端展示配图和来源。

    健康约束：
    1. 结合 profile.chronic_conditions、allergies、taste_preferences、goals 和 rules 判断适配性。
    2. 对高血压、控盐、肾病等人群，避免高盐、浓汤、腌制、加工肉、重口酱汁。
    3. 对控糖、糖尿病、减脂人群，避免高糖饮品、甜点、精制主食过量，优先高纤维和稳定碳水。
    4. 对高血脂、控脂人群，避免油炸、肥肉、奶油、重油菜，优先蒸煮炖和优质蛋白。
    5. 对过敏信息必须严格回避；如果候选食谱食材命中过敏项，不要推荐。
    6. 不做医学诊断，不承诺治疗效果，只给饮食管理建议。

    推荐内容要求：
    1. 最多返回 4 个食谱，宁少勿滥。
    2. reason 必须说明“为什么适合这个用户”，不能只写“营养均衡”“健康美味”。
    3. summary 要简短描述菜品特点或执行方式。
    4. tags 和 suitable_for 使用简体中文，贴近用户能理解的表达。
    5. 如果选择已有或外部候选食谱，name 必须和候选中的名称完全一致，便于后端合并详情。
    6. source 只能是 library、external、generated 三者之一。
    7. 对 generated 食谱，必须给出 ingredients、steps、nutrition 的基本信息，不要只给菜名。
    8. 不推荐明显冲突的菜，例如用户控盐却推荐腌制卤味，用户过敏虾却推荐虾仁菜。

    输出要求：
    - 只返回 JSON 对象，不要 markdown，不要解释文本。
    - 返回结构必须是 {"items":[...]}。
    - 每个 item 至少包含 name、summary、reason、source、tags、suitable_for。
    - 若存在 cover_url、source_url、source_provider、ingredients、steps、nutrition，应尽量保留或补全。
    """
).strip()


def build_recipe_recommendation_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    visible_recipes = payload.get("recipes") or []
    local_names = [
        str(item.get("name") or "").strip()
        for item in visible_recipes
        if item.get("name") and (item.get("source") or "library") != "external"
    ]
    external_names = [
        str(item.get("name") or "").strip()
        for item in visible_recipes
        if item.get("name") and item.get("source") == "external"
    ]
    external_with_image = [
        str(item.get("name") or "").strip()
        for item in visible_recipes
        if item.get("name") and item.get("source") == "external" and item.get("cover_url")
    ]
    local_preview = ", ".join(local_names[:16]) if local_names else "none"
    external_preview = ", ".join(external_names[:16]) if external_names else "none"
    image_preview = ", ".join(external_with_image[:12]) if external_with_image else "none"
    context = payload.get("context") or {}
    exclude_names = [str(item).strip() for item in (context.get("exclude_names") or []) if str(item).strip()]
    exclude_preview = ", ".join(exclude_names[:12]) if exclude_names else "none"

    user_prompt = (
        "请基于用户健康档案、营养目标、禁忌规则、本地食谱库和外部候选食谱，推荐最多 4 个食谱。\n"
        f"本地候选预览：{local_preview}\n"
        f"外部候选预览：{external_preview}\n"
        f"带配图的外部候选：{image_preview}\n"
        f"尽量避免重复推荐：{exclude_preview}\n"
        "如果外部候选不违反过敏、禁忌和健康目标，必须至少选择 1 个带配图的外部食谱；prefer_external=true 时优先选择 2 个外部食谱。\n"
        "返回格式必须是 JSON 对象，结构如下：\n"
        '{"items":[{"name":"","summary":"","reason":"","source":"","cover_url":"","source_url":"","source_provider":"","ingredients":[{"name":"","amount":""}],"steps":[""],"nutrition":{},"tags":[""],"suitable_for":[""]}]}\n'
        "Payload:\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )

    return [
        {
            "role": "system",
            "content": (
                f"你是{RECIPE_RECOMMENDATION_SKILL_NAME}。"
                "始终使用简体中文。严格遵守下面的推荐技能，并只返回 JSON 对象。\n"
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
                            "name": {"type": "string"},
                            "summary": {"type": "string"},
                            "reason": {"type": "string"},
                            "source": {"type": "string", "enum": ["library", "external", "generated"]},
                            "cover_url": {"type": "string"},
                            "source_url": {"type": "string"},
                            "source_provider": {"type": "string"},
                            "ingredients": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "amount": {"type": "string"},
                                    },
                                    "required": ["name", "amount"],
                                    "additionalProperties": False,
                                },
                            },
                            "steps": {"type": "array", "items": {"type": "string"}},
                            "nutrition": {"type": "object"},
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "suitable_for": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": [
                            "name",
                            "summary",
                            "reason",
                            "source",
                            "cover_url",
                            "source_url",
                            "source_provider",
                            "ingredients",
                            "steps",
                            "nutrition",
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
