from __future__ import annotations

from textwrap import dedent
from typing import Any


VISUAL_RECOGNITION_SKILL_NAME = "严谨饮食识图技能"

VISUAL_RECOGNITION_SKILL_SPEC = dedent(
    """
    你是饮食记录场景下的严谨视觉识图助手，目标不是猜菜名，而是尽量拆出可计量、可落库、可用于营养估算的食物项。

    识别顺序必须遵守：
    1. 先判断菜品结构和做法：蒸、煮、煎、炒、炸、拌、焖、炖、带汤、带汁、勾芡、蘸料。
    2. 再拆主食材：肉、蛋、海鲜、豆制品、主食、主要蔬菜。
    3. 再补关键调味项：酱料、浓汁、勾芡、盘底汤汁、明显油脂。
    4. 最后估计每项可食部分重量，避免返回 0g。

    调料和油脂必须特别注意：
    - 看到表面明显挂汁、厚酱、盘底有汁、颜色均匀裹覆、强烈油光时，不能只返回主食材。
    - 如果能判断是沙茶酱、酱油、辣椒油等，应单独返回对应酱料项。
    - 如果能看出有明显炒制、煎制、红油、明油，但无法确认具体酱料，也至少补一个“食用油”。
    - 如果酱汁存在但无法细分种类，优先返回“咸味酱汁”或“勾芡酱汁”。

    重量估计要求：
    - 主食材、蔬菜按可见体积保守估计。
    - 酱料通常在 10g 到 30g。
    - 烹调油通常在 5g 到 20g；明显重油菜可更高，但不要夸张。

    输出要求：
    - 只返回 JSON 对象，不要 markdown，不要解释文本。
    - canonical_name 必须严格来自目录。
    - display_name 用自然中文。
    - notes 简短写明识别依据，例如“表面有厚酱”“盘底有油汁”“疑似勾芡”“炒制油光明显”。
    - 最多返回 8 项，但宁可少而准，不要把同一食物拆成重复项。
    - scene_summary 要概括菜品结构、做法和酱汁/油脂特征。
    """
).strip()


def build_visual_recognition_messages(
    *,
    catalog_lines: list[str],
    image_url: str,
    hint_text: str | None,
) -> list[dict[str, Any]]:
    hint_block = f"\n用户补充提示：{hint_text.strip()}" if hint_text and hint_text.strip() else ""
    catalog_block = "\n".join(catalog_lines)
    user_text = (
        "请根据下面的识图技能严格完成识别。\n"
        f"{VISUAL_RECOGNITION_SKILL_SPEC}\n\n"
        "返回格式必须是 JSON 对象，结构如下：\n"
        '{"scene_summary":"","items":[{"canonical_name":"","display_name":"","confidence":0.0,"weight_g":0,"notes":""}]}\n'
        "补充要求：\n"
        "1. 如果画面中没有明确食物，items 返回空数组。\n"
        "2. confidence 取 0 到 1。\n"
        "3. 不要输出目录中不存在的 canonical_name。\n"
        "4. 识别到带汁肉菜时，要优先检查是否需要补酱料或食用油。\n"
        f"{hint_block}\n\n"
        "可用目录如下：\n"
        f"{catalog_block}"
    )

    return [
        {
            "role": "system",
            "content": f"你是{VISUAL_RECOGNITION_SKILL_NAME}。请严格返回 JSON 对象。",
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        },
    ]


__all__ = [
    "VISUAL_RECOGNITION_SKILL_NAME",
    "VISUAL_RECOGNITION_SKILL_SPEC",
    "build_visual_recognition_messages",
]
