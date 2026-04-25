from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from backend.db import db_session


class AdminDashboardRepository:
    DEFAULT_QUOTAS = {
        "text": 5_000_000,
        "image": 10_000_000,
    }
    # 这里先按你当前供应商后台资源包截图写死初始基线，
    # 后续应用内新增的 AI 调用会继续叠加到 used_total 中。
    DEFAULT_REMAINING_BASELINE = {
        "text": 4_439_089,
        "image": 9_755_138,
    }
    DEFAULT_PRIMARY_MODELS = {
        "text": "GLM-4.7",
        "image": "GLM-4.6V",
    }

    def log_ai_usage(
        self,
        user_id: UUID,
        *,
        endpoint: str,
        provider: str,
        model_name: str,
        model_kind: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
    ) -> None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_usage_logs (
                    user_id, endpoint, provider, model_name, model_kind,
                    prompt_tokens, completion_tokens, total_tokens
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    endpoint,
                    provider,
                    model_name,
                    model_kind,
                    max(int(prompt_tokens or 0), 0),
                    max(int(completion_tokens or 0), 0),
                    max(int(total_tokens or 0), 0),
                ),
            )
            conn.commit()

    def get_dashboard_snapshot(self, days: int = 7, users_limit: int = 10, users_offset: int = 0) -> dict[str, Any]:
        safe_days = max(int(days or 7), 1)
        safe_limit = max(int(users_limit or 10), 1)
        safe_offset = max(int(users_offset or 0), 0)
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
        active_since = now - timedelta(days=30)
        chart_start = today_start - timedelta(days=safe_days - 1)

        quotas = self._get_token_quotas()
        token_usage = self._get_token_usage()
        total_users = self._count_total_users()
        users = self._list_users(safe_limit, safe_offset)

        return {
            "summary": {
                "total_users": total_users,
                "active_users_30d": self._count_active_users_since(active_since),
                "daily_active_users": self._count_active_users_since(today_start),
                "ai_calls_total": self._count_ai_calls(),
                "ai_calls_today": self._count_ai_calls(today_start),
            },
            "tokens": {
                kind: {
                    "quota_total": quotas.get(kind, 0),
                    "used_total": token_usage.get(kind, {}).get("used_total", 0),
                    "used_today": token_usage.get(kind, {}).get("used_today", 0),
                    "call_total": token_usage.get(kind, {}).get("call_total", 0),
                    "call_today": token_usage.get(kind, {}).get("call_today", 0),
                    "primary_model": token_usage.get(kind, {}).get("primary_model", ""),
                    "remaining_total": max(
                        quotas.get(kind, 0) - token_usage.get(kind, {}).get("used_total", 0),
                        0,
                    ),
                }
                for kind in ("text", "image")
            },
            "daily_ai_calls": self._get_daily_ai_calls(chart_start, safe_days),
            "users": users,
            "users_meta": {
                "limit": safe_limit,
                "offset": safe_offset,
                "returned": len(users),
                "has_more": safe_offset + len(users) < total_users,
            },
        }

    def get_dashboard_users(self, limit: int = 10, offset: int = 0) -> dict[str, Any]:
        safe_limit = max(int(limit or 10), 1)
        safe_offset = max(int(offset or 0), 0)
        total_users = self._count_total_users()
        users = self._list_users(safe_limit, safe_offset)
        return {
            "users": users,
            "users_meta": {
                "limit": safe_limit,
                "offset": safe_offset,
                "returned": len(users),
                "has_more": safe_offset + len(users) < total_users,
                "total_users": total_users,
            },
        }

    def _get_token_quotas(self) -> dict[str, int]:
        quotas = dict(self.DEFAULT_QUOTAS)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("SELECT model_kind, total_tokens FROM ai_token_quotas")
            rows = cur.fetchall()
        for row in rows:
            quotas[str(row.get("model_kind") or "")] = int(row.get("total_tokens") or 0)
        return quotas

    def _get_token_usage(self) -> dict[str, dict[str, Any]]:
        baseline_used_total = {
            kind: max(self.DEFAULT_QUOTAS.get(kind, 0) - self.DEFAULT_REMAINING_BASELINE.get(kind, 0), 0)
            for kind in ("text", "image")
        }
        usage: dict[str, dict[str, Any]] = {
            "text": {
                "used_total": baseline_used_total["text"],
                "used_today": 0,
                "call_total": 0,
                "call_today": 0,
                "primary_model": self.DEFAULT_PRIMARY_MODELS["text"],
            },
            "image": {
                "used_total": baseline_used_total["image"],
                "used_today": 0,
                "call_total": 0,
                "call_today": 0,
                "primary_model": self.DEFAULT_PRIMARY_MODELS["image"],
            },
        }
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    model_kind,
                    COALESCE(SUM(total_tokens), 0) AS used_total,
                    COUNT(*) AS call_total,
                    COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', now()) THEN total_tokens ELSE 0 END), 0) AS used_today,
                    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS call_today
                FROM ai_usage_logs
                GROUP BY model_kind
                """
            )
            rows = cur.fetchall()
            cur.execute(
                """
                SELECT model_kind, model_name, COUNT(*) AS hit_count
                FROM ai_usage_logs
                WHERE model_name IS NOT NULL AND model_name <> ''
                GROUP BY model_kind, model_name
                ORDER BY model_kind, hit_count DESC, model_name ASC
                """
            )
            model_rows = cur.fetchall()

        for row in rows:
            kind = str(row.get("model_kind") or "")
            if kind not in usage:
                continue
            usage[kind] = {
                "used_total": baseline_used_total[kind] + int(row.get("used_total") or 0),
                "used_today": int(row.get("used_today") or 0),
                "call_total": int(row.get("call_total") or 0),
                "call_today": int(row.get("call_today") or 0),
                "primary_model": usage[kind]["primary_model"],
            }

        seen_kind: set[str] = set()
        for row in model_rows:
            kind = str(row.get("model_kind") or "")
            if kind in usage and kind not in seen_kind:
                usage[kind]["primary_model"] = str(row.get("model_name") or "")
                seen_kind.add(kind)

        return usage

    def _count_total_users(self) -> int:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM users")
            row = cur.fetchone() or {}
        return int(row.get("total") or 0)

    def _count_ai_calls(self, since: datetime | None = None) -> int:
        with db_session() as conn, conn.cursor() as cur:
            if since is None:
                cur.execute("SELECT COUNT(*) AS total FROM ai_usage_logs")
            else:
                cur.execute("SELECT COUNT(*) AS total FROM ai_usage_logs WHERE created_at >= %s", (since,))
            row = cur.fetchone() or {}
        return int(row.get("total") or 0)

    def _count_active_users_since(self, since: datetime) -> int:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS total
                FROM (
                    SELECT id AS user_id FROM users WHERE last_login_at >= %s
                    UNION
                    SELECT user_id FROM meals WHERE created_at >= %s
                    UNION
                    SELECT user_id FROM ai_usage_logs WHERE created_at >= %s
                ) AS active_users
                """,
                (since, since, since),
            )
            row = cur.fetchone() or {}
        return int(row.get("total") or 0)

    def _get_daily_ai_calls(self, start_at: datetime, days: int) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS total_calls,
                    COUNT(*) FILTER (WHERE model_kind = 'text') AS text_calls,
                    COUNT(*) FILTER (WHERE model_kind = 'image') AS image_calls
                FROM ai_usage_logs
                WHERE created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY day ASC
                """,
                (start_at,),
            )
            rows = cur.fetchall()

        row_map = {
            row["day"].isoformat() if isinstance(row.get("day"), date) else str(row.get("day")): row
            for row in rows
        }
        points: list[dict[str, Any]] = []
        for offset in range(days):
            current_day = (start_at + timedelta(days=offset)).date()
            key = current_day.isoformat()
            row = row_map.get(key) or {}
            points.append(
                {
                    "key": key,
                    "label": current_day.strftime("%m/%d"),
                    "total_calls": int(row.get("total_calls") or 0),
                    "text_calls": int(row.get("text_calls") or 0),
                    "image_calls": int(row.get("image_calls") or 0),
                }
            )
        return points

    def get_user_detail(self, user_id: UUID) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                WITH meal_stats AS (
                    SELECT user_id, COUNT(*) AS meal_count, MAX(created_at) AS last_meal_at
                    FROM meals
                    GROUP BY user_id
                ),
                ai_stats AS (
                    SELECT user_id, COUNT(*) AS ai_call_count, MAX(created_at) AS last_ai_call_at
                    FROM ai_usage_logs
                    GROUP BY user_id
                )
                SELECT
                    u.id,
                    u.display_name,
                    u.phone,
                    u.roles,
                    u.avatar_data,
                    u.created_at,
                    u.last_login_at,
                    COALESCE(ms.meal_count, 0) AS meal_count,
                    COALESCE(ai.ai_call_count, 0) AS ai_call_count,
                    GREATEST(
                        COALESCE(u.last_login_at, u.created_at),
                        COALESCE(ms.last_meal_at, u.created_at),
                        COALESCE(ai.last_ai_call_at, u.created_at)
                    ) AS last_active_at
                FROM users u
                LEFT JOIN meal_stats ms ON ms.user_id = u.id
                LEFT JOIN ai_stats ai ON ai.user_id = u.id
                WHERE u.id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()

        if not row:
            return None

        return {
            "id": str(row.get("id") or ""),
            "display_name": row.get("display_name") or "",
            "phone": row.get("phone") or "",
            "roles": row.get("roles") or [],
            "avatar_url": row.get("avatar_data") or None,
            "created_at": self._to_iso(row.get("created_at")),
            "last_login_at": self._to_iso(row.get("last_login_at")),
            "last_active_at": self._to_iso(row.get("last_active_at")),
            "meal_count": int(row.get("meal_count") or 0),
            "ai_call_count": int(row.get("ai_call_count") or 0),
        }

    def _list_users(self, limit: int, offset: int = 0) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                WITH meal_stats AS (
                    SELECT user_id, COUNT(*) AS meal_count, MAX(created_at) AS last_meal_at
                    FROM meals
                    GROUP BY user_id
                ),
                ai_stats AS (
                    SELECT user_id, COUNT(*) AS ai_call_count, MAX(created_at) AS last_ai_call_at
                    FROM ai_usage_logs
                    GROUP BY user_id
                )
                SELECT
                    u.id,
                    u.display_name,
                    u.phone,
                    u.roles,
                    u.avatar_data,
                    u.created_at,
                    u.last_login_at,
                    COALESCE(ms.meal_count, 0) AS meal_count,
                    COALESCE(ai.ai_call_count, 0) AS ai_call_count,
                    GREATEST(
                        COALESCE(u.last_login_at, u.created_at),
                        COALESCE(ms.last_meal_at, u.created_at),
                        COALESCE(ai.last_ai_call_at, u.created_at)
                    ) AS last_active_at
                FROM users u
                LEFT JOIN meal_stats ms ON ms.user_id = u.id
                LEFT JOIN ai_stats ai ON ai.user_id = u.id
                ORDER BY
                    CASE
                        WHEN 'webmaster' = ANY(u.roles) THEN 0
                        WHEN 'admin' = ANY(u.roles) THEN 1
                        ELSE 2
                    END ASC,
                    last_active_at DESC,
                    u.created_at DESC
                LIMIT %s
                OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

        users: list[dict[str, Any]] = []
        for row in rows:
            users.append(
                {
                    "id": str(row.get("id") or ""),
                    "display_name": row.get("display_name") or "",
                    "phone": row.get("phone") or "",
                    "roles": row.get("roles") or [],
                    "avatar_url": row.get("avatar_data") or None,
                    "created_at": self._to_iso(row.get("created_at")),
                    "last_login_at": self._to_iso(row.get("last_login_at")),
                    "last_active_at": self._to_iso(row.get("last_active_at")),
                    "meal_count": int(row.get("meal_count") or 0),
                    "ai_call_count": int(row.get("ai_call_count") or 0),
                }
            )
        return users

    @staticmethod
    def _to_iso(value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()
        return None


__all__ = ["AdminDashboardRepository"]
