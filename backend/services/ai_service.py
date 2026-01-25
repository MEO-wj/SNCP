from __future__ import annotations

from typing import Any

import requests

from backend.config import Config


class AIService:
    """AI能力封装。

    说明：这里提供统一入口，便于替换不同的AI服务实现。
    """

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()

    def recognize_foods(
        self,
        image_base64: str | None = None,
        image_url: str | None = None,
        hint_text: str | None = None,
    ) -> dict[str, Any]:
        """识别图片中的食物。

        返回结构：
            {"items": [{"name": "...", "category": "...", "confidence": 0.0}], "provider": "..."}
        """
        if not self.config.ai_food_recognition_url:
            return {"items": [], "provider": "local", "message": "未配置食物识别服务"}

        payload = {"image_base64": image_base64, "image_url": image_url, "hint_text": hint_text}
        headers = {"Content-Type": "application/json"}
        if self.config.ai_food_recognition_key:
            headers["Authorization"] = f"Bearer {self.config.ai_food_recognition_key}"

        response = requests.post(
            self.config.ai_food_recognition_url,
            json=payload,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items") or data.get("foods") or []
        normalized = []
        for item in items:
            normalized.append(
                {
                    "name": item.get("name") or item.get("food_name") or "",
                    "category": item.get("category"),
                    "confidence": item.get("confidence", 0.0),
                    "weight_g": item.get("weight_g"),
                }
            )
        return {"items": normalized, "provider": "remote"}

    def analyze_nutrition(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.config.ai_nutrition_analysis_url:
            return {"analysis": None, "provider": "local", "message": "未配置营养分析服务"}

        headers = {"Content-Type": "application/json"}
        if self.config.ai_nutrition_analysis_key:
            headers["Authorization"] = f"Bearer {self.config.ai_nutrition_analysis_key}"
        response = requests.post(
            self.config.ai_nutrition_analysis_url,
            json=payload,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        return {"analysis": response.json(), "provider": "remote"}

    def recommend_recipes(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.config.ai_recipe_recommend_url:
            return {"items": [], "provider": "local", "message": "未配置推荐服务"}

        headers = {"Content-Type": "application/json"}
        if self.config.ai_recipe_recommend_key:
            headers["Authorization"] = f"Bearer {self.config.ai_recipe_recommend_key}"
        response = requests.post(
            self.config.ai_recipe_recommend_url,
            json=payload,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        return {"items": data.get("items") or [], "provider": "remote"}


__all__ = ["AIService"]
