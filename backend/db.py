from __future__ import annotations

import contextlib

import psycopg
from psycopg.rows import dict_row

from backend.config import Config


cfg = Config()


def get_connection() -> psycopg.Connection:
    if not cfg.database_url:
        raise RuntimeError("DATABASE_URL 未配置，无法连接数据库")
    return psycopg.connect(cfg.database_url, row_factory=dict_row, connect_timeout=5)


@contextlib.contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            phone TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            password_algo TEXT NOT NULL,
            password_cost INT NOT NULL,
            roles TEXT[] NOT NULL DEFAULT '{}',
            avatar_data TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_login_at TIMESTAMPTZ,
            last_seen_at TIMESTAMPTZ
        );
        """,
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;",
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            refresh_token_sha TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            user_agent TEXT,
            ip TEXT,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);",
        """
        CREATE TABLE IF NOT EXISTS health_profiles (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            gender TEXT,
            birth_year INT,
            height_cm NUMERIC,
            weight_kg NUMERIC,
            chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
            allergies TEXT[] NOT NULL DEFAULT '{}',
            taste_preferences TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS nutrition_goals (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            calories_min INT,
            calories_max INT,
            protein_min INT,
            protein_max INT,
            fat_min INT,
            fat_max INT,
            carbs_min INT,
            carbs_max INT,
            sodium_max INT,
            sugar_max INT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS meals (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            meal_type TEXT NOT NULL,
            eaten_at TIMESTAMPTZ NOT NULL,
            client_request_id TEXT,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "CREATE INDEX IF NOT EXISTS meals_user_time_idx ON meals(user_id, eaten_at DESC);",
        "ALTER TABLE meals ADD COLUMN IF NOT EXISTS client_request_id TEXT;",
        "CREATE UNIQUE INDEX IF NOT EXISTS meals_user_client_request_idx ON meals(user_id, client_request_id);",
        """
        CREATE TABLE IF NOT EXISTS meal_items (
            id BIGSERIAL PRIMARY KEY,
            meal_id BIGINT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
            food_name TEXT NOT NULL,
            food_category TEXT,
            weight_g NUMERIC,
            source TEXT,
            nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "CREATE INDEX IF NOT EXISTS meal_items_meal_idx ON meal_items(meal_id);",
        """
        CREATE TABLE IF NOT EXISTS recipes (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            cuisine TEXT,
            cover_url TEXT,
            source_url TEXT,
            source_provider TEXT,
            tags TEXT[] NOT NULL DEFAULT '{}',
            ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
            steps JSONB NOT NULL DEFAULT '[]'::jsonb,
            nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
            suitable_for TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;",
        "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cover_url TEXT;",
        "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;",
        "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_provider TEXT;",
        "CREATE INDEX IF NOT EXISTS recipes_name_idx ON recipes(name);",
        "CREATE INDEX IF NOT EXISTS recipes_user_idx ON recipes(user_id, updated_at DESC, id DESC);",
        """
        CREATE TABLE IF NOT EXISTS health_rules (
            id BIGSERIAL PRIMARY KEY,
            tag TEXT NOT NULL UNIQUE,
            forbidden_foods TEXT[] NOT NULL DEFAULT '{}',
            tips TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS reminders (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reminder_type TEXT NOT NULL,
            time_of_day TEXT NOT NULL,
            repeat_days INT[] NOT NULL DEFAULT '{}',
            enabled BOOLEAN NOT NULL DEFAULT true,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "CREATE INDEX IF NOT EXISTS reminders_user_idx ON reminders(user_id);",
        """
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL,
            provider TEXT NOT NULL,
            model_name TEXT NOT NULL,
            model_kind TEXT NOT NULL,
            prompt_tokens INT NOT NULL DEFAULT 0,
            completion_tokens INT NOT NULL DEFAULT 0,
            total_tokens INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "CREATE INDEX IF NOT EXISTS ai_usage_logs_user_idx ON ai_usage_logs(user_id, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS ai_usage_logs_kind_idx ON ai_usage_logs(model_kind, created_at DESC);",
        """
        CREATE TABLE IF NOT EXISTS ai_token_quotas (
            model_kind TEXT PRIMARY KEY,
            total_tokens BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS app_update_settings (
            singleton_key TEXT PRIMARY KEY,
            latest_version TEXT,
            latest_build INT NOT NULL DEFAULT 0,
            min_supported_build INT NOT NULL DEFAULT 0,
            force_update BOOLEAN NOT NULL DEFAULT false,
            published_at TIMESTAMPTZ,
            release_notes TEXT[] NOT NULL DEFAULT '{}',
            android_apk_url TEXT,
            android_apk_path TEXT,
            android_download_name TEXT,
            ios_url TEXT,
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS latest_version TEXT;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS latest_build INT NOT NULL DEFAULT 0;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS min_supported_build INT NOT NULL DEFAULT 0;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS force_update BOOLEAN NOT NULL DEFAULT false;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS release_notes TEXT[] NOT NULL DEFAULT '{}';",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS android_apk_url TEXT;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS android_apk_path TEXT;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS android_download_name TEXT;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS ios_url TEXT;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();",
        "ALTER TABLE app_update_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();",
        """
        INSERT INTO ai_token_quotas (model_kind, total_tokens)
        VALUES ('text', 5000000)
        ON CONFLICT (model_kind) DO UPDATE
        SET total_tokens = EXCLUDED.total_tokens,
            updated_at = now();
        """,
        """
        INSERT INTO ai_token_quotas (model_kind, total_tokens)
        VALUES ('image', 10000000)
        ON CONFLICT (model_kind) DO UPDATE
        SET total_tokens = EXCLUDED.total_tokens,
            updated_at = now();
        """,
    ]

    with get_connection() as conn, conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
        conn.commit()


__all__ = ["db_session", "get_connection", "init_db"]
