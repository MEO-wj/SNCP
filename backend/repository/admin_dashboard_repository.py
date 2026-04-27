from __future__ import annotations

from datetime import date, datetime, timedelta, timezone, tzinfo
from typing import Any
from uuid import UUID

from backend.db import db_session
from backend.utils.timezone_context import local_date_span_to_utc_range, local_day_to_utc_range, to_local_date


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

    def get_dashboard_snapshot(
        self,
        days: int = 7,
        users_limit: int = 10,
        users_offset: int = 0,
        request_tz: tzinfo = timezone.utc,
    ) -> dict[str, Any]:
        safe_days = max(int(days or 7), 1)
        safe_limit = max(int(users_limit or 10), 1)
        safe_offset = max(int(users_offset or 0), 0)
        today_local = datetime.now(request_tz).date()
        today_start_utc, _ = local_day_to_utc_range(today_local, request_tz)
        active_since_local = today_local - timedelta(days=29)
        active_since_utc, _ = local_day_to_utc_range(active_since_local, request_tz)
        chart_start_day = today_local - timedelta(days=safe_days - 1)

        quotas = self._get_token_quotas()
        token_usage = self._get_token_usage(today_start_utc)
        total_users = self._count_total_users()
        users = self._list_users(safe_limit, safe_offset)

        return {
            "summary": {
                "total_users": total_users,
                "active_users_30d": self._count_active_users_since(active_since_utc),
                "daily_active_users": self._count_active_users_since(today_start_utc),
                "ai_calls_total": self._count_ai_calls(),
                "ai_calls_today": self._count_ai_calls(today_start_utc),
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
            "daily_ai_calls": self._get_daily_ai_calls(chart_start_day, safe_days, request_tz),
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

    def _get_token_usage(self, today_start_utc: datetime) -> dict[str, dict[str, Any]]:
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
                    COALESCE(SUM(CASE WHEN created_at >= %s THEN total_tokens ELSE 0 END), 0) AS used_today,
                    COUNT(*) FILTER (WHERE created_at >= %s) AS call_today
                FROM ai_usage_logs
                GROUP BY model_kind
                """,
                (today_start_utc, today_start_utc),
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

    def _get_daily_ai_calls(self, start_day: date, days: int, request_tz: tzinfo) -> list[dict[str, Any]]:
        end_day = start_day + timedelta(days=days - 1)
        start_utc, end_utc = local_date_span_to_utc_range(start_day, end_day, request_tz)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    created_at,
                    model_kind
                FROM ai_usage_logs
                WHERE created_at >= %s AND created_at < %s
                ORDER BY created_at ASC
                """,
                (start_utc, end_utc),
            )
            rows = cur.fetchall()

        points: list[dict[str, Any]] = []
        for offset in range(days):
            current_day = start_day + timedelta(days=offset)
            points.append(
                {
                    "key": current_day.isoformat(),
                    "label": current_day.strftime("%m/%d"),
                    "total_calls": 0,
                    "text_calls": 0,
                    "image_calls": 0,
                }
            )

        point_map = {point["key"]: point for point in points}
        for row in rows:
            created_at = row.get("created_at")
            if not isinstance(created_at, datetime):
                continue
            key = to_local_date(created_at, request_tz).isoformat()
            point = point_map.get(key)
            if not point:
                continue
            point["total_calls"] += 1
            model_kind = str(row.get("model_kind") or "")
            if model_kind == "text":
                point["text_calls"] += 1
            elif model_kind == "image":
                point["image_calls"] += 1
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
