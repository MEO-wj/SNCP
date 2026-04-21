from __future__ import annotations

import json
import logging
import time
from decimal import Decimal
from datetime import date, datetime
from typing import Any
from uuid import UUID

import requests

from backend.config import Config
from ai_end.services.food_catalog_service import (
    build_catalog_meal_item,
    build_local_hint_matches,
    get_catalog_prompt_lines,
    match_food_entry,
)
from ai_end.services.recognition_skill import build_visual_recognition_messages

logger = logging.getLogger(__name__)

ZHIPU_RETRYABLE_ERROR_CODES = {"1302", "1305"}
ZHIPU_RETRY_DELAYS_SECONDS = (1.0, 2.0)


class AIService:
    """Unified AI entrypoint for recognition, analysis, and recommendation."""

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()

    def recognize_foods(
        self,
        image_base64: str | None = None,
        image_url: str | None = None,
        hint_text: str | None = None,
    ) -> dict[str, Any]:
        if self.config.ai_food_recognition_url:
            payload = {"image_base64": image_base64, "image_url": image_url, "hint_text": hint_text}
            headers = {"Content-Type": "application/json"}
            if self.config.ai_food_recognition_key:
                headers["Authorization"] = f"Bearer {self.config.ai_food_recognition_key}"

            response = requests.post(
                self.config.ai_food_recognition_url,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            normalized = self._normalize_recognition_items(data.get("items") or data.get("foods") or [])
            return {
                "items": normalized,
                "provider": "remote",
                "message": data.get("message"),
                "scene_summary": data.get("scene_summary"),
            }

        if self.config.zhipu_api_key and (image_base64 or image_url):
            try:
                return self._recognize_with_zhipu(image_base64=image_base64, image_url=image_url, hint_text=hint_text)
            except Exception as exc:  # pragma: no cover
                local_items = build_local_hint_matches(hint_text)
                if local_items:
                    return {
                        "items": local_items,
                        "provider": "local",
                        "message": f"智谱视觉识别暂时不可用，已根据提示词给出近似匹配结果: {exc}",
                        "scene_summary": hint_text or "",
                    }
                return {
                    "items": [],
                    "provider": "local",
                    "message": f"智谱视觉识别暂时不可用，请稍后重试: {exc}",
                }

        if self.config.openai_api_key and (image_base64 or image_url):
            try:
                return self._recognize_with_openai(image_base64=image_base64, image_url=image_url, hint_text=hint_text)
            except Exception as exc:  # pragma: no cover
                local_items = build_local_hint_matches(hint_text)
                if local_items:
                    return {
                        "items": local_items,
                        "provider": "local",
                        "message": f"视觉识别暂时不可用，已根据提示词给出近似匹配结果: {exc}",
                        "scene_summary": hint_text or "",
                    }
                return {
                    "items": [],
                    "provider": "local",
                    "message": f"视觉识别暂时不可用，请稍后重试: {exc}",
                }

        local_items = build_local_hint_matches(hint_text)
        if local_items:
            return {
                "items": local_items,
                "provider": "local",
                "message": "当前未配置视觉模型，已根据提示词给出近似匹配结果。",
                "scene_summary": hint_text or "",
            }

        return {
            "items": [],
            "provider": "local",
            "message": "未配置食物识别服务。可设置 ZHIPU_API_KEY 启用图片识别，或先输入提示词做本地匹配。",
        }

    def analyze_nutrition(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.config.ai_nutrition_analysis_url:
            headers = {"Content-Type": "application/json"}
            if self.config.ai_nutrition_analysis_key:
                headers["Authorization"] = f"Bearer {self.config.ai_nutrition_analysis_key}"
            response = requests.post(
                self.config.ai_nutrition_analysis_url,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            return {"analysis": response.json(), "provider": "remote"}

        if self.config.zhipu_api_key:
            try:
                return {"analysis": self._analyze_with_zhipu(payload), "provider": "zhipu"}
            except Exception as exc:  # pragma: no cover
                return {
                    "analysis": self._build_local_analysis(payload),
                    "provider": "local",
                    "message": f"AI 分析不可用，已切换为规则分析: {exc}",
                }

        if self.config.openai_api_key:
            try:
                return {"analysis": self._analyze_with_openai(payload), "provider": "openai"}
            except Exception as exc:  # pragma: no cover
                return {
                    "analysis": self._build_local_analysis(payload),
                    "provider": "local",
                    "message": f"AI 分析不可用，已切换为规则分析: {exc}",
                }

        return {
            "analysis": self._build_local_analysis(payload),
            "provider": "local",
            "message": "未配置营养分析服务，已使用本地规则生成建议。",
        }

    def recommend_recipes(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.config.ai_recipe_recommend_url:
            headers = {"Content-Type": "application/json"}
            if self.config.ai_recipe_recommend_key:
                headers["Authorization"] = f"Bearer {self.config.ai_recipe_recommend_key}"
            response = requests.post(
                self.config.ai_recipe_recommend_url,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "items": data.get("items") or [],
                "provider": "remote",
                "message": data.get("message"),
            }

        if self.config.zhipu_api_key:
            try:
                return {
                    "items": self._recommend_with_zhipu(payload),
                    "provider": "zhipu",
                }
            except Exception as exc:  # pragma: no cover
                return {
                    "items": self._recommend_with_rules(payload),
                    "provider": "rules",
                    "message": f"AI 推荐不可用，已切换为规则推荐: {exc}",
                }

        if self.config.openai_api_key:
            try:
                return {
                    "items": self._recommend_with_openai(payload),
                    "provider": "openai",
                }
            except Exception as exc:  # pragma: no cover
                return {
                    "items": self._recommend_with_rules(payload),
                    "provider": "rules",
                    "message": f"AI 推荐不可用，已切换为规则推荐: {exc}",
                }

        return {
            "items": self._recommend_with_rules(payload),
            "provider": "rules",
            "message": "未配置推荐服务，已使用本地规则推荐。",
        }

    def _recognize_with_zhipu(
        self,
        *,
        image_base64: str | None,
        image_url: str | None,
        hint_text: str | None,
    ) -> dict[str, Any]:
        data_url = image_url or self._build_image_data_url(image_base64)
        if not data_url:
            return {
                "items": [],
                "provider": "local",
                "message": "缺少图片输入，无法调用视觉识别。",
            }

        messages = build_visual_recognition_messages(
            catalog_lines=get_catalog_prompt_lines(),
            image_url=data_url,
            hint_text=hint_text,
        )
        data = self._zhipu_chat_completion(
            messages,
            model=self.config.zhipu_vision_model,
            max_tokens=1200,
        )
        items = self._normalize_recognition_items(data.get("items") or [])
        return {
            "items": items,
            "provider": "zhipu",
            "scene_summary": data.get("scene_summary"),
            "message": "已通过智谱视觉模型完成识别，请在保存前确认份量。",
        }

    def _normalize_recognition_items(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for item in items:
            entry = match_food_entry(
                item.get("canonical_name") or item.get("food_name") or item.get("name") or item.get("display_name")
            )
            if not entry:
                continue
            normalized.append(
                build_catalog_meal_item(
                    entry,
                    weight_g=item.get("weight_g"),
                    confidence=item.get("confidence"),
                    source=item.get("source") or "ai",
                    display_name=item.get("display_name") or item.get("name") or entry["name"],
                    notes=item.get("notes"),
                )
            )
        return normalized

    def _analyze_with_zhipu(self, payload: dict[str, Any]) -> dict[str, Any]:
        messages = [
            {
                "role": "system",
                "content": (
                    "你是中文营养分析助手。请基于用户当餐或当天数据，输出简洁、可执行、"
                    "适合中老年与慢病人群的建议。不要诊断疾病。"
                    "请同时给出 0-100 的营养评分，综合考虑总量目标、蛋白/脂肪/碳水供能结构、"
                    "是否存在脂肪占比偏高或蛋白不足等问题。请严格返回 JSON 对象，不要输出解释。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请根据下面 JSON 给出营养总结。\n"
                    "返回格式必须是 JSON 对象，结构如下："
                    '{"score":0,"summary":"","strengths":[""],"risks":[""],"next_actions":[""]}\n'
                    f"{json.dumps(self._prepare_for_json(payload), ensure_ascii=False)}"
                ),
            },
        ]
        result = self._zhipu_chat_completion(
            messages,
            model=self.config.zhipu_text_model,
            max_tokens=900,
            response_format_type="json_object",
        )
        return self._normalize_analysis_result(result, payload)

    def _analyze_with_openai(self, payload: dict[str, Any]) -> dict[str, Any]:
        messages = [
            {
                "role": "system",
                "content": (
                    "你是中文营养分析助手。请基于用户当餐或当天数据，输出简洁、可执行、"
                    "适合中老年与慢病人群的建议。不要诊断疾病。"
                    "请同时给出 0-100 的营养评分，综合考虑总量目标、蛋白/脂肪/碳水供能结构、"
                    "是否存在脂肪占比偏高或蛋白不足等问题。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请根据下面 JSON 给出营养总结。\n"
                    f"{json.dumps(self._prepare_for_json(payload), ensure_ascii=False)}"
                ),
            },
        ]
        schema = {
            "name": "nutrition_analysis",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "score": {"type": "number"},
                    "summary": {"type": "string"},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "risks": {"type": "array", "items": {"type": "string"}},
                    "next_actions": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["score", "summary", "strengths", "risks", "next_actions"],
                "additionalProperties": False,
            },
        }
        result = self._chat_completion(messages, schema=schema, max_tokens=900)
        return self._normalize_analysis_result(result, payload)

    def _build_local_analysis(self, payload: dict[str, Any]) -> dict[str, Any]:
        totals = payload.get("totals") or {}
        goal_checks = payload.get("goal_checks") or []
        warnings = payload.get("warnings") or []
        suggestions = payload.get("suggestions") or []
        macro_ratio = payload.get("macro_ratio") or {}
        protein_ratio = float(macro_ratio.get("protein") or 0.0)
        fat_ratio = float(macro_ratio.get("fat") or 0.0)
        carbs_ratio = float(macro_ratio.get("carbs") or 0.0)
        rule_score = self._coerce_score(payload.get("rule_score"), default=80)

        highlights: list[str] = []
        if (totals.get("protein") or 0) >= 25:
            highlights.append("蛋白摄入相对充足。")
        if (totals.get("fiber") or 0) >= 8:
            highlights.append("膳食纤维表现较好。")
        if 0.2 <= fat_ratio <= 0.35:
            highlights.append("脂肪供能占比处于相对合理区间。")
        if not highlights:
            highlights.append("这餐的营养结构比较基础，建议结合全天目标一起看。")

        risks: list[str] = []
        for check in goal_checks:
            if check.get("status") == "high":
                risks.append(f"{check.get('name')}偏高，后续餐次可适当回调。")
            elif check.get("status") == "low":
                risks.append(f"{check.get('name')}偏低，下一餐可有意识补足。")
        if fat_ratio > 0.35:
            risks.append("脂肪供能占比偏高，全天结构容易偏油。")
        if protein_ratio < 0.15:
            risks.append("蛋白供能占比偏低，饱腹感和恢复支持可能不足。")
        if carbs_ratio < 0.35:
            risks.append("碳水供能占比偏低，容易影响全天能量分配。")
        risks.extend(warnings[:3])

        next_actions = suggestions[:3]
        if fat_ratio > 0.35:
            next_actions.insert(0, "下一餐优先换成瘦肉、豆制品或清淡做法，主动压低脂肪占比。")
        if protein_ratio < 0.15:
            next_actions.insert(0, "适当增加鱼虾、鸡胸肉、鸡蛋或豆制品，提高蛋白占比。")
        if not next_actions:
            next_actions = [
                "优先保证优质蛋白和蔬菜的搭配。",
                "高盐高糖食物尽量放到更小份量。",
                "把总热量分散到三餐和必要加餐中。",
            ]

        score = rule_score
        if fat_ratio > 0.4:
            score -= 18
        elif fat_ratio > 0.35:
            score -= 10
        if protein_ratio < 0.12:
            score -= 10
        elif protein_ratio < 0.15:
            score -= 6
        if carbs_ratio < 0.3:
            score -= 8
        elif carbs_ratio < 0.35:
            score -= 4

        return {
            "score": max(0, min(int(round(score)), 100)),
            "summary": " ".join(highlights[:2]),
            "strengths": highlights[:3],
            "risks": risks[:3],
            "next_actions": next_actions[:3],
        }

    def _normalize_analysis_result(self, data: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        normalized: dict[str, Any] = {
            "score": self._coerce_score(data.get("score"), default=self._coerce_score(payload.get("rule_score"), default=80)),
            "summary": str(data.get("summary") or "").strip(),
            "strengths": self._coerce_string_list(data.get("strengths")),
            "risks": self._coerce_string_list(data.get("risks")),
            "next_actions": self._coerce_string_list(data.get("next_actions")),
        }

        if not normalized["summary"]:
            normalized["summary"] = "已结合营养目标和摄入结构生成建议。"
        if not normalized["strengths"]:
            normalized["strengths"] = ["已结合当天摄入情况生成综合判断。"]
        if not normalized["next_actions"]:
            normalized["next_actions"] = ["下一餐继续关注优质蛋白、蔬菜和烹饪用油控制。"]
        return normalized

    def _coerce_string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        result: list[str] = []
        for item in value:
            text = str(item or "").strip()
            if text:
                result.append(text)
        return result[:3]

    def _coerce_score(self, value: Any, *, default: int) -> int:
        try:
            score = int(round(float(value)))
        except (TypeError, ValueError):
            score = default
        return max(0, min(score, 100))

    def _build_recipe_recommendation_messages(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        prepared_payload = self._prepare_for_json(payload)
        visible_recipes = prepared_payload.get("recipes") or []
        recipe_names = [str(item.get("name") or "").strip() for item in visible_recipes if item.get("name")]
        preview_text = ", ".join(recipe_names[:20]) if recipe_names else "none"
        context = prepared_payload.get("context") or {}
        exclude_names = [str(item).strip() for item in (context.get("exclude_names") or []) if str(item).strip()]
        exclude_preview = ", ".join(exclude_names[:12]) if exclude_names else "none"

        system_prompt = (
            "You are a nutrition recipe recommendation assistant. "
            "Always respond in Simplified Chinese. "
            "The input includes the user's local recipe library and external recipe candidates in payload.recipes. "
            "You should prioritize the user's local recipe library when it is clearly suitable, "
            "but you may choose external candidates when they better match the user's needs or add useful variety. "
            "If you choose an existing local recipe, keep its name exactly the same and set source to 'library'. "
            "If you choose an external candidate, keep its name exactly the same and set source to 'external'. "
            "Only propose a new recipe when neither local nor external candidates are suitable, and then set source to 'generated'. "
            "When payload.context.exclude_names is not empty, avoid recommending those recipes if reasonable alternatives exist. "
            "Return at most 4 items. "
            "Reasons must be specific to the user's health profile, goals, keyword, and restrictions. "
            "Return only a JSON object."
        )
        user_prompt = (
            "Please recommend up to 4 recipes based on the user's profile, goals, restrictions, local recipe library, and external candidates.\n"
            f"Visible recipe names preview: {preview_text}\n"
            f"Names to avoid when possible: {exclude_preview}\n"
            "Response format must be a JSON object with this structure:\n"
            '{"items":[{"name":"","summary":"","reason":"","source":"","tags":[""],"suitable_for":[""]}]}\n'
            "Payload:\n"
            f"{json.dumps(prepared_payload, ensure_ascii=False)}"
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _recommend_with_zhipu(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        messages = self._build_recipe_recommendation_messages(payload)
        data = self._zhipu_chat_completion(
            messages,
            model=self.config.zhipu_text_model,
            max_tokens=1000,
            response_format_type="json_object",
        )
        candidates = self._recommend_with_rules(payload)
        by_name = {item["name"]: item for item in candidates}
        merged: list[dict[str, Any]] = []
        for item in data.get("items") or []:
            merged.append({**by_name.get(item["name"], {}), **item})
        selected = self._apply_recommendation_refresh(merged, payload)
        return selected[:4] or self._apply_recommendation_refresh(candidates, payload)[:4]

    def _recommend_with_openai(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        messages = self._build_recipe_recommendation_messages(payload)
        schema = {
            "name": "recipe_recommendations",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "summary": {"type": "string"},
                                "reason": {"type": "string"},
                                "source": {"type": "string"},
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
        data = self._chat_completion(messages, schema=schema, max_tokens=1000)
        candidates = self._recommend_with_rules(payload)
        by_name = {item["name"]: item for item in candidates}
        merged: list[dict[str, Any]] = []
        for item in data.get("items") or []:
            merged.append({**by_name.get(item["name"], {}), **item})
        selected = self._apply_recommendation_refresh(merged, payload)
        return selected[:4] or self._apply_recommendation_refresh(candidates, payload)[:4]

    def _recommend_with_rules(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        profile = payload.get("profile") or {}
        context = payload.get("context") or {}
        rules = payload.get("rules") or []
        recipes = payload.get("recipes") or []
        keyword = str(context.get("keyword") or "").strip().lower()
        health_tags = set(profile.get("chronic_conditions") or [])
        allergies = set(profile.get("allergies") or [])
        taste_preferences = [str(item).lower() for item in (profile.get("taste_preferences") or [])]

        forbidden_keywords: set[str] = set()
        for rule in rules:
            if rule.get("tag") in health_tags:
                forbidden_keywords.update(str(item).lower() for item in (rule.get("forbidden_foods") or []))

        ranked: list[dict[str, Any]] = []
        for recipe in recipes:
            name = str(recipe.get("name") or "")
            name_lower = name.lower()
            tags = [str(tag) for tag in (recipe.get("tags") or [])]
            tags_lower = [tag.lower() for tag in tags]
            suitable_for = [str(tag) for tag in (recipe.get("suitable_for") or [])]
            ingredients = recipe.get("ingredients") or []
            ingredient_names: list[str] = []
            for item in ingredients:
                if isinstance(item, dict):
                    ingredient_names.append(str(item.get("name") or ""))
                elif item:
                    ingredient_names.append(str(item))
            ingredient_blob = " ".join(ingredient_names).lower()

            score = 0
            reasons: list[str] = []

            if keyword and (keyword in name_lower or any(keyword in tag for tag in tags_lower)):
                score += 3
                reasons.append("和当前搜索意图相关")
            if health_tags.intersection(suitable_for):
                score += 4
                reasons.append("适合当前健康档案")
            if taste_preferences and any(pref and pref in name_lower for pref in taste_preferences):
                score += 2
                reasons.append("贴合口味偏好")
            if any(keyword and keyword in ingredient_blob for keyword in allergies):
                score -= 6
                reasons.append("命中过敏信息，需要规避")
            if any(keyword and keyword in ingredient_blob for keyword in forbidden_keywords):
                score -= 4
                reasons.append("与健康禁忌存在冲突")
            if recipe.get("nutrition"):
                score += 1
            if not reasons:
                reasons.append("作为均衡家常选择可纳入备选")

            ranked.append(
                {
                    "recipe_id": recipe.get("id"),
                    "name": name,
                    "cuisine": recipe.get("cuisine"),
                    "tags": tags,
                    "suitable_for": suitable_for,
                    "ingredients": ingredients,
                    "steps": recipe.get("steps") or [],
                    "nutrition": recipe.get("nutrition") or {},
                    "cover_url": recipe.get("cover_url") or "",
                    "source_url": recipe.get("source_url") or "",
                    "source_provider": recipe.get("source_provider") or "",
                    "summary": "、".join(reasons[:2]),
                    "reason": "；".join(reasons[:3]),
                    "source": recipe.get("source") or "library",
                    "_score": score,
                }
            )

        ranked.sort(key=lambda item: (item["_score"], item["name"]), reverse=True)
        top = self._apply_recommendation_refresh(
            [self._strip_private_fields(item) for item in ranked if item["_score"] >= -1],
            payload,
        )[:4]
        if top:
            return top
        return self._apply_recommendation_refresh(self._fallback_recipe_templates(health_tags), payload)[:4]

    def _apply_recommendation_refresh(self, items: list[dict[str, Any]], payload: dict[str, Any]) -> list[dict[str, Any]]:
        if not items:
            return []

        filtered = list(items)
        excluded_names, refresh_round = self._get_recommendation_refresh_context(payload)
        if excluded_names:
            without_excluded = [
                item
                for item in filtered
                if self._normalize_recipe_name(item.get("name")) not in excluded_names
            ]
            if without_excluded:
                filtered = without_excluded

        if refresh_round > 0 and len(filtered) > 1:
            offset = refresh_round % len(filtered)
            if offset:
                filtered = filtered[offset:] + filtered[:offset]

        return filtered

    def _get_recommendation_refresh_context(self, payload: dict[str, Any]) -> tuple[set[str], int]:
        context = payload.get("context") or {}
        raw_excluded = context.get("exclude_names") or []
        excluded_names = {
            self._normalize_recipe_name(item)
            for item in raw_excluded
            if self._normalize_recipe_name(item)
        } if isinstance(raw_excluded, list) else set()

        raw_refresh_round = context.get("refresh_round")
        try:
            refresh_round = max(int(raw_refresh_round), 0)
        except (TypeError, ValueError):
            refresh_round = 0

        return excluded_names, refresh_round

    def _fallback_recipe_templates(self, health_tags: set[str]) -> list[dict[str, Any]]:
        templates = [
            {
                "name": "清蒸鳕鱼配西兰花",
                "summary": "高蛋白、低油盐，适合作为午餐或晚餐主菜。",
                "reason": "鱼类和蔬菜搭配稳定，适合需要控制油脂和盐分的人群。",
                "tags": ["高蛋白", "低油盐", "家常"],
                "suitable_for": sorted(health_tags) or ["通用"],
                "nutrition": {"calories": 260, "protein": 28, "fat": 9, "carbs": 12},
                "source": "generated",
            },
            {
                "name": "燕麦酸奶水果杯",
                "summary": "适合早餐或加餐，饱腹感和纤维都更稳。",
                "reason": "燕麦、水果和酸奶组合简单，适合需要更平稳能量释放的人群。",
                "tags": ["早餐", "高纤维", "轻食"],
                "suitable_for": sorted(health_tags) or ["通用"],
                "nutrition": {"calories": 280, "protein": 12, "fat": 7, "carbs": 40},
                "source": "generated",
            },
            {
                "name": "鸡胸肉糙米饭便当",
                "summary": "蛋白和主食结构清晰，适合日常稳态饮食。",
                "reason": "鸡胸肉和糙米的组合便于控制总量，也方便做长期记录。",
                "tags": ["均衡", "便当", "控量"],
                "suitable_for": sorted(health_tags) or ["通用"],
                "nutrition": {"calories": 430, "protein": 32, "fat": 11, "carbs": 48},
                "source": "generated",
            },
            {
                "name": "番茄豆腐蔬菜汤",
                "summary": "清淡、补水、容易消化，适合作为晚餐配汤。",
                "reason": "番茄和豆腐组合温和，适合需要控制重口味的人群。",
                "tags": ["清淡", "汤品", "低负担"],
                "suitable_for": sorted(health_tags) or ["通用"],
                "nutrition": {"calories": 150, "protein": 11, "fat": 6, "carbs": 13},
                "source": "generated",
            },
        ]
        return templates[:4]

    def _zhipu_chat_completion(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        max_tokens: int,
        response_format_type: str | None = None,
    ) -> dict[str, Any]:
        url = self._normalize_chat_completion_url(self.config.zhipu_base_url)
        headers = {
            "Authorization": f"Bearer {self.config.zhipu_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "max_tokens": max_tokens,
            "thinking": {"type": "disabled"},
        }
        if response_format_type:
            payload["response_format"] = {"type": response_format_type}

        provider = f"zhipu:{model}"
        for attempt in range(len(ZHIPU_RETRY_DELAYS_SECONDS) + 1):
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            try:
                self._raise_for_status_with_details(response, provider=provider)
            except requests.HTTPError:
                if not self._should_retry_zhipu_response(response) or attempt >= len(ZHIPU_RETRY_DELAYS_SECONDS):
                    raise
                delay_seconds = ZHIPU_RETRY_DELAYS_SECONDS[attempt]
                error_code = self._extract_error_code(response) or "unknown"
                logger.warning(
                    "%s transient error detected, retrying in %.1fs (attempt %s/%s, code=%s)",
                    provider,
                    delay_seconds,
                    attempt + 1,
                    len(ZHIPU_RETRY_DELAYS_SECONDS),
                    error_code,
                )
                time.sleep(delay_seconds)
                continue

            data = response.json()
            content = self._extract_message_content(((data.get("choices") or [{}])[0].get("message") or {}).get("content"))
            return self._load_json_object(content)

        raise RuntimeError(f"{provider} request ended without a response")

    def _chat_completion(
        self,
        messages: list[dict[str, Any]],
        *,
        schema: dict[str, Any],
        max_tokens: int,
    ) -> dict[str, Any]:
        url = f"{self.config.openai_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.openai_api_key}",
            "Content-Type": "application/json",
        }
        if self.config.openai_project_id:
            headers["OpenAI-Project"] = self.config.openai_project_id
        if self.config.openai_org_id:
            headers["OpenAI-Organization"] = self.config.openai_org_id

        response = requests.post(
            url,
            headers=headers,
            json={
                "model": self.config.openai_model,
                "messages": messages,
                "response_format": {"type": "json_schema", "json_schema": schema},
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        self._raise_for_status_with_details(response, provider=f"openai:{self.config.openai_model}")
        data = response.json()
        content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "{}"
        return self._load_json_object(content)

    @staticmethod
    def _strip_private_fields(item: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in item.items() if not key.startswith("_")}

    @staticmethod
    def _build_image_data_url(image_base64: str | None) -> str | None:
        if not image_base64:
            return None
        return f"data:image/jpeg;base64,{image_base64}"

    @staticmethod
    def _normalize_recipe_name(value: Any) -> str:
        return "".join(str(value or "").strip().lower().split())

    @staticmethod
    def _normalize_chat_completion_url(base_url: str) -> str:
        normalized = base_url.rstrip("/")
        if normalized.endswith("/chat/completions"):
            return normalized
        return f"{normalized}/chat/completions"

    @staticmethod
    def _extract_message_content(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")
                    if text:
                        parts.append(str(text))
                elif item:
                    parts.append(str(item))
            return "\n".join(parts)
        if content is None:
            return "{}"
        return str(content)

    @staticmethod
    def _load_json_object(raw: str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(raw, dict):
            return raw
        text = str(raw).strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines:
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        data = json.loads(text)
        return AIService._unwrap_json_payload(data)

    @staticmethod
    def _raise_for_status_with_details(response: requests.Response, *, provider: str) -> None:
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            detail = AIService._summarize_response_body(response)
            logger.warning("%s request failed with status %s: %s", provider, response.status_code, detail)
            raise requests.HTTPError(
                f"{exc}. provider={provider}. response_body={detail}",
                request=response.request,
                response=response,
            ) from exc

    @staticmethod
    def _summarize_response_body(response: requests.Response) -> str:
        raw = (response.text or "").strip()
        if not raw:
            return "<empty>"

        try:
            payload = response.json()
        except ValueError:
            payload = None

        if payload is not None:
            compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        else:
            compact = " ".join(raw.split())

        if len(compact) > 1200:
            return f"{compact[:1200]}...(truncated)"
        return compact

    @staticmethod
    def _extract_error_code(response: requests.Response) -> str | None:
        payload = AIService._parse_response_payload(response)
        if not isinstance(payload, dict):
            return None
        error = payload.get("error")
        if isinstance(error, dict) and error.get("code") is not None:
            return str(error.get("code"))
        if payload.get("code") is not None:
            return str(payload.get("code"))
        return None

    @staticmethod
    def _should_retry_zhipu_response(response: requests.Response) -> bool:
        if response.status_code != 429:
            return False
        error_code = AIService._extract_error_code(response)
        return error_code is None or error_code in ZHIPU_RETRYABLE_ERROR_CODES

    @staticmethod
    def _parse_response_payload(response: requests.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return None

    @staticmethod
    def _unwrap_json_payload(data: Any) -> dict[str, Any]:
        if isinstance(data, dict):
            if len(data) == 1:
                sole_value = next(iter(data.values()))
                if isinstance(sole_value, str):
                    stripped = sole_value.strip()
                    if stripped.startswith("{") or stripped.startswith("["):
                        parsed = json.loads(stripped)
                        if isinstance(parsed, dict):
                            return AIService._unwrap_json_payload(parsed)
            return data
        raise ValueError("AI 返回结果不是 JSON 对象")


    @classmethod
    def _prepare_for_json(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(key): cls._prepare_for_json(item) for key, item in value.items()}
        if isinstance(value, list):
            return [cls._prepare_for_json(item) for item in value]
        if isinstance(value, tuple):
            return [cls._prepare_for_json(item) for item in value]
        if isinstance(value, Decimal):
            if value.is_finite() and value == value.to_integral_value():
                return int(value)
            return float(value)
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value


__all__ = ["AIService"]
