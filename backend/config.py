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
        self.yolo_food_enabled: bool = False
        self.yolo_food_weight_path: Path = self.project_root / "ai_end" / "models" / "yolo_food" / "cafeteria_yolo_uec.pt"
        self.yolo_food_labels_path: Path = self.project_root / "ai_end" / "models" / "yolo_food" / "label_names_zh.json"
        self.yolo_food_aliases_path: Path = self.project_root / "ai_end" / "models" / "yolo_food" / "yolo_to_catalog_aliases.json"
        self.yolo_food_device: str = "auto"
        self.yolo_food_img_size: int = 512
        self.yolo_food_conf: float = 0.55
        self.yolo_food_iou: float = 0.45
        self.yolo_food_max_det: int = 8
        self.yolo_food_timeout_ms: int = 1500
        self.yolo_food_half: bool = True
        self.yolo_food_require_reference: bool = False
        self.yolo_food_max_image_side: int = 1280
        self.themealdb_base_url: str = "https://www.themealdb.com/api"
        self.themealdb_api_key: str = "1"
        self.app_update_latest_version: Optional[str] = None
        self.app_update_latest_build: int = 0
        self.app_update_min_supported_build: int = 0
        self.app_update_force_update: bool = False
        self.app_update_published_at: Optional[str] = None
        self.app_update_release_notes: list[str] = []
        self.app_update_android_apk_url: Optional[str] = None
        self.app_update_android_apk_path: Optional[Path] = None
        self.app_update_android_release_dir: Path = Path("/app/releases")
        self.app_update_android_download_name: Optional[str] = None
        self.app_update_ios_url: Optional[str] = None

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
            "YOLO_FOOD_ENABLED",
            "YOLO_FOOD_WEIGHT_PATH",
            "YOLO_FOOD_LABELS_PATH",
            "YOLO_FOOD_ALIASES_PATH",
            "YOLO_FOOD_DEVICE",
            "YOLO_FOOD_IMG_SIZE",
            "YOLO_FOOD_CONF",
            "YOLO_FOOD_IOU",
            "YOLO_FOOD_MAX_DET",
            "YOLO_FOOD_TIMEOUT_MS",
            "YOLO_FOOD_HALF",
            "YOLO_FOOD_REQUIRE_REFERENCE",
            "YOLO_FOOD_MAX_IMAGE_SIDE",
            "THEMEALDB_BASE_URL",
            "THEMEALDB_API_KEY",
            "APP_UPDATE_LATEST_VERSION",
            "APP_UPDATE_LATEST_BUILD",
            "APP_UPDATE_MIN_SUPPORTED_BUILD",
            "APP_UPDATE_FORCE_UPDATE",
            "APP_UPDATE_PUBLISHED_AT",
            "APP_UPDATE_RELEASE_NOTES",
            "APP_UPDATE_ANDROID_APK_URL",
            "APP_UPDATE_ANDROID_APK_PATH",
            "APP_UPDATE_ANDROID_RELEASE_DIR",
            "APP_UPDATE_ANDROID_DOWNLOAD_NAME",
            "APP_UPDATE_IOS_URL",
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
        elif key == "YOLO_FOOD_ENABLED":
            self.yolo_food_enabled = self._parse_bool(value, fallback=self.yolo_food_enabled)
        elif key == "YOLO_FOOD_WEIGHT_PATH":
            self.yolo_food_weight_path = self._resolve_path(value) if value else self.yolo_food_weight_path
        elif key == "YOLO_FOOD_LABELS_PATH":
            self.yolo_food_labels_path = self._resolve_path(value) if value else self.yolo_food_labels_path
        elif key == "YOLO_FOOD_ALIASES_PATH":
            self.yolo_food_aliases_path = self._resolve_path(value) if value else self.yolo_food_aliases_path
        elif key == "YOLO_FOOD_DEVICE":
            self.yolo_food_device = value or self.yolo_food_device
        elif key == "YOLO_FOOD_IMG_SIZE":
            self.yolo_food_img_size = self._parse_int(value, fallback=self.yolo_food_img_size, minimum=128)
        elif key == "YOLO_FOOD_CONF":
            self.yolo_food_conf = self._parse_float(value, fallback=self.yolo_food_conf, minimum=0.0, maximum=1.0)
        elif key == "YOLO_FOOD_IOU":
            self.yolo_food_iou = self._parse_float(value, fallback=self.yolo_food_iou, minimum=0.0, maximum=1.0)
        elif key == "YOLO_FOOD_MAX_DET":
            self.yolo_food_max_det = self._parse_int(value, fallback=self.yolo_food_max_det, minimum=1)
        elif key == "YOLO_FOOD_TIMEOUT_MS":
            self.yolo_food_timeout_ms = self._parse_int(value, fallback=self.yolo_food_timeout_ms, minimum=100)
        elif key == "YOLO_FOOD_HALF":
            self.yolo_food_half = self._parse_bool(value, fallback=self.yolo_food_half)
        elif key == "YOLO_FOOD_REQUIRE_REFERENCE":
            self.yolo_food_require_reference = self._parse_bool(value, fallback=self.yolo_food_require_reference)
        elif key == "YOLO_FOOD_MAX_IMAGE_SIDE":
            self.yolo_food_max_image_side = self._parse_int(value, fallback=self.yolo_food_max_image_side, minimum=320)
        elif key == "THEMEALDB_BASE_URL":
            self.themealdb_base_url = value or self.themealdb_base_url
        elif key == "THEMEALDB_API_KEY":
            self.themealdb_api_key = value or self.themealdb_api_key
        elif key == "APP_UPDATE_LATEST_VERSION":
            self.app_update_latest_version = value or None
        elif key == "APP_UPDATE_LATEST_BUILD":
            self.app_update_latest_build = self._parse_int(value, fallback=self.app_update_latest_build, minimum=0)
        elif key == "APP_UPDATE_MIN_SUPPORTED_BUILD":
            self.app_update_min_supported_build = self._parse_int(
                value,
                fallback=self.app_update_min_supported_build,
                minimum=0,
            )
        elif key == "APP_UPDATE_FORCE_UPDATE":
            self.app_update_force_update = self._parse_bool(value, fallback=self.app_update_force_update)
        elif key == "APP_UPDATE_PUBLISHED_AT":
            self.app_update_published_at = value or None
        elif key == "APP_UPDATE_RELEASE_NOTES":
            self.app_update_release_notes = [part.strip() for part in value.split("|") if part.strip()]
        elif key == "APP_UPDATE_ANDROID_APK_URL":
            self.app_update_android_apk_url = value or None
        elif key == "APP_UPDATE_ANDROID_APK_PATH":
            self.app_update_android_apk_path = self._resolve_path(value) if value else None
        elif key == "APP_UPDATE_ANDROID_RELEASE_DIR":
            self.app_update_android_release_dir = self._resolve_path(value) if value else self.app_update_android_release_dir
        elif key == "APP_UPDATE_ANDROID_DOWNLOAD_NAME":
            self.app_update_android_download_name = value or None
        elif key == "APP_UPDATE_IOS_URL":
            self.app_update_ios_url = value or None

    @staticmethod
    def _parse_ttl(raw: str, fallback: timedelta) -> timedelta:
        try:
            seconds = int(raw)
            return timedelta(seconds=seconds)
        except ValueError:
            return fallback

    @staticmethod
    def _parse_int(raw: str, fallback: int, minimum: int | None = None) -> int:
        try:
            value = int(raw)
        except ValueError:
            return fallback
        if minimum is not None and value < minimum:
            return fallback
        return value

    @staticmethod
    def _parse_float(raw: str, fallback: float, minimum: float | None = None, maximum: float | None = None) -> float:
        try:
            value = float(raw)
        except ValueError:
            return fallback
        if minimum is not None and value < minimum:
            return fallback
        if maximum is not None and value > maximum:
            return fallback
        return value

    @staticmethod
    def _parse_bool(raw: str, fallback: bool) -> bool:
        normalized = raw.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return fallback


__all__ = ["Config"]
