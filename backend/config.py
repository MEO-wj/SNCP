from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from typing import Optional


class Config:
    """后端配置加载器（仅包含后端所需字段）。"""

    def __init__(self, env_file: str | Path | None = None) -> None:
        self.project_root = Path(__file__).resolve().parents[1]
        default_env = Path(__file__).resolve().parent / ".env"
        self.env_file = self._resolve_path(env_file) if env_file else default_env

        # 默认值
        self.database_url: Optional[str] = None
        self.db_init_max_attempts: int = 30
        self.db_init_retry_delay_seconds: int = 2
        self.auth_access_token_ttl: timedelta = timedelta(days=7)
        self.auth_refresh_token_ttl: timedelta = timedelta(days=7)
        self.auth_jwt_secret: Optional[str] = None
        self.auth_password_cost: int = 12
        self.auth_refresh_hash_key: Optional[str] = None
        self.admin_phones: list[str] = []
        self.admin_login_name: str = "admin"
        self.admin_phone: str = "00000000000"
        self.admin_display_name: str = "管理员"
        self.admin_password: str = "795348503"
        self.redis_host: str = "localhost"
        self.redis_port: int = 6379
        self.redis_db: int = 0
        self.redis_password: Optional[str] = None
        self.cors_allow_origins: list[str] = ["*"]
        self.rate_limit_per_day: Optional[int] = None
        self.rate_limit_per_hour: Optional[int] = None
        # AI（用于食物识别、营养分析、推荐）
        self.ai_food_recognition_url: Optional[str] = None
        self.ai_food_recognition_key: Optional[str] = None
        self.ai_nutrition_analysis_url: Optional[str] = None
        self.ai_nutrition_analysis_key: Optional[str] = None
        self.ai_recipe_recommend_url: Optional[str] = None
        self.ai_recipe_recommend_key: Optional[str] = None
        self.zhipu_api_key: Optional[str] = None
        self.zhipu_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
        self.zhipu_vision_model: str = "glm-4.6v"
        self.zhipu_text_model: str = "glm-4.7"
        self.themealdb_base_url: str = "https://www.themealdb.com/api"
        self.themealdb_api_key: str = "1"
        self.openai_api_key: Optional[str] = None
        self.openai_project_id: Optional[str] = None
        self.openai_org_id: Optional[str] = None
        self.openai_base_url: str = "https://api.openai.com/v1"
        self.openai_model: str = "gpt-5-mini"

        self.load()

    # 加载逻辑
    def load(self) -> None:
        self._load_from_env_file()
        self._override_with_environment()

    def _resolve_path(self, value: str | Path) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path
        return (self.project_root / path).resolve()

    def _load_from_env_file(self) -> None:
        if not self.env_file.exists():
            return
        try:
            for raw in self.env_file.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, raw_value = line.split("=", 1)
                self._apply_setting(key.strip().upper(), raw_value.strip())
        except OSError as exc:
            raise RuntimeError(f"无法读取配置文件: {self.env_file}") from exc

    def _override_with_environment(self) -> None:
        keys = [
            "DATABASE_URL",
            "DB_INIT_MAX_ATTEMPTS",
            "DB_INIT_RETRY_DELAY_SECONDS",
            "AUTH_ACCESS_TOKEN_TTL",
            "AUTH_REFRESH_TOKEN_TTL",
            "AUTH_JWT_SECRET",
            "AUTH_PASSWORD_COST",
            "AUTH_REFRESH_HASH_KEY",
            "ADMIN_PHONES",
            "ADMIN_LOGIN_NAME",
            "ADMIN_PHONE",
            "ADMIN_DISPLAY_NAME",
            "ADMIN_PASSWORD",
            "REDIS_HOST",
            "REDIS_PORT",
            "REDIS_DB",
            "REDIS_PASSWORD",
            "CORS_ALLOW_ORIGINS",
            "RATE_LIMIT_PER_DAY",
            "RATE_LIMIT_PER_HOUR",
            "AI_FOOD_RECOGNITION_URL",
            "AI_FOOD_RECOGNITION_KEY",
            "AI_NUTRITION_ANALYSIS_URL",
            "AI_NUTRITION_ANALYSIS_KEY",
            "AI_RECIPE_RECOMMEND_URL",
            "AI_RECIPE_RECOMMEND_KEY",
            "ZHIPU_API_KEY",
            "ZHIPU_BASE_URL",
            "ZHIPU_VISION_MODEL",
            "ZHIPU_TEXT_MODEL",
            "THEMEALDB_BASE_URL",
            "THEMEALDB_API_KEY",
            "OPENAI_API_KEY",
            "OPENAI_PROJECT_ID",
            "OPENAI_ORG_ID",
            "OPENAI_BASE_URL",
            "OPENAI_MODEL",
        ]
        for key in keys:
            value = os.getenv(key)
            if value is not None and value != "":
                self._apply_setting(key, value)

    def _apply_setting(self, key: str, raw_value: str) -> None:
        value = raw_value.strip()
        if key == "DATABASE_URL":
            self.database_url = value or None
        elif key == "DB_INIT_MAX_ATTEMPTS":
            try:
                attempts = int(value)
                self.db_init_max_attempts = attempts if attempts > 0 else self.db_init_max_attempts
            except ValueError:
                pass
        elif key == "DB_INIT_RETRY_DELAY_SECONDS":
            try:
                delay = int(value)
                self.db_init_retry_delay_seconds = delay if delay >= 0 else self.db_init_retry_delay_seconds
            except ValueError:
                pass
        elif key == "AUTH_ACCESS_TOKEN_TTL":
            self.auth_access_token_ttl = self._parse_ttl(value, fallback=self.auth_access_token_ttl)
        elif key == "AUTH_REFRESH_TOKEN_TTL":
            self.auth_refresh_token_ttl = self._parse_ttl(value, fallback=self.auth_refresh_token_ttl)
        elif key == "AUTH_JWT_SECRET":
            self.auth_jwt_secret = value or None
        elif key == "AUTH_PASSWORD_COST":
            try:
                self.auth_password_cost = int(value)
            except ValueError:
                pass
        elif key == "AUTH_REFRESH_HASH_KEY":
            self.auth_refresh_hash_key = value or None
        elif key == "ADMIN_PHONES":
            self.admin_phones = [part.strip() for part in value.split(",") if part.strip()]
        elif key == "ADMIN_LOGIN_NAME":
            self.admin_login_name = value or self.admin_login_name
        elif key == "ADMIN_PHONE":
            self.admin_phone = value or self.admin_phone
        elif key == "ADMIN_DISPLAY_NAME":
            self.admin_display_name = value or self.admin_display_name
        elif key == "ADMIN_PASSWORD":
            self.admin_password = value or self.admin_password
        elif key == "REDIS_HOST":
            self.redis_host = value
        elif key == "REDIS_PORT":
            try:
                self.redis_port = int(value)
            except ValueError:
                pass
        elif key == "REDIS_DB":
            try:
                self.redis_db = int(value)
            except ValueError:
                pass
        elif key == "REDIS_PASSWORD":
            self.redis_password = value or None
        elif key == "CORS_ALLOW_ORIGINS":
            self.cors_allow_origins = [part.strip() for part in value.split(",") if part.strip()]
        elif key == "RATE_LIMIT_PER_DAY":
            try:
                limit = int(value)
                self.rate_limit_per_day = limit if limit > 0 else None
            except ValueError:
                pass
        elif key == "RATE_LIMIT_PER_HOUR":
            try:
                limit = int(value)
                self.rate_limit_per_hour = limit if limit > 0 else None
            except ValueError:
                pass
        elif key == "AI_FOOD_RECOGNITION_URL":
            self.ai_food_recognition_url = value or None
        elif key == "AI_FOOD_RECOGNITION_KEY":
            self.ai_food_recognition_key = value or None
        elif key == "AI_NUTRITION_ANALYSIS_URL":
            self.ai_nutrition_analysis_url = value or None
        elif key == "AI_NUTRITION_ANALYSIS_KEY":
            self.ai_nutrition_analysis_key = value or None
        elif key == "AI_RECIPE_RECOMMEND_URL":
            self.ai_recipe_recommend_url = value or None
        elif key == "AI_RECIPE_RECOMMEND_KEY":
            self.ai_recipe_recommend_key = value or None
        elif key == "ZHIPU_API_KEY":
            self.zhipu_api_key = value or None
        elif key == "ZHIPU_BASE_URL":
            self.zhipu_base_url = value or self.zhipu_base_url
        elif key == "ZHIPU_VISION_MODEL":
            self.zhipu_vision_model = value or self.zhipu_vision_model
        elif key == "ZHIPU_TEXT_MODEL":
            self.zhipu_text_model = value or self.zhipu_text_model
        elif key == "THEMEALDB_BASE_URL":
            self.themealdb_base_url = value or self.themealdb_base_url
        elif key == "THEMEALDB_API_KEY":
            self.themealdb_api_key = value or self.themealdb_api_key
        elif key == "OPENAI_API_KEY":
            self.openai_api_key = value or None
        elif key == "OPENAI_PROJECT_ID":
            self.openai_project_id = value or None
        elif key == "OPENAI_ORG_ID":
            self.openai_org_id = value or None
        elif key == "OPENAI_BASE_URL":
            self.openai_base_url = value or self.openai_base_url
        elif key == "OPENAI_MODEL":
            self.openai_model = value or self.openai_model

    @staticmethod
    def _parse_ttl(raw: str, fallback: timedelta) -> timedelta:
        try:
            seconds = int(raw)
            return timedelta(seconds=seconds)
        except ValueError:
            return fallback


__all__ = ["Config"]
