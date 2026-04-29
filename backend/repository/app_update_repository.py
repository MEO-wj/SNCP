from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from backend.db import db_session

SINGLETON_KEY = "default"


class AppUpdateRepository:
    def get_current(self) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    singleton_key,
                    latest_version,
                    latest_build,
                    min_supported_build,
                    force_update,
                    published_at,
                    release_notes,
                    android_apk_url,
                    android_apk_path,
                    android_download_name,
                    ios_url,
                    updated_by,
                    created_at,
                    updated_at
                FROM app_update_settings
                WHERE singleton_key = %s
                """,
                (SINGLETON_KEY,),
            )
            row = cur.fetchone()
        return self._normalize_row(row)

    def upsert_current(
        self,
        *,
        latest_version: str | None,
        latest_build: int,
        min_supported_build: int,
        force_update: bool,
        published_at: datetime | None,
        release_notes: list[str],
        android_apk_url: str | None,
        android_apk_path: str | None,
        android_download_name: str | None,
        ios_url: str | None,
        updated_by: UUID | None,
    ) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_update_settings (
                    singleton_key,
                    latest_version,
                    latest_build,
                    min_supported_build,
                    force_update,
                    published_at,
                    release_notes,
                    android_apk_url,
                    android_apk_path,
                    android_download_name,
                    ios_url,
                    updated_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                ON CONFLICT (singleton_key)
                DO UPDATE SET
                    latest_version = EXCLUDED.latest_version,
                    latest_build = EXCLUDED.latest_build,
                    min_supported_build = EXCLUDED.min_supported_build,
                    force_update = EXCLUDED.force_update,
                    published_at = EXCLUDED.published_at,
                    release_notes = EXCLUDED.release_notes,
                    android_apk_url = EXCLUDED.android_apk_url,
                    android_apk_path = EXCLUDED.android_apk_path,
                    android_download_name = EXCLUDED.android_download_name,
                    ios_url = EXCLUDED.ios_url,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
                RETURNING
                    singleton_key,
                    latest_version,
                    latest_build,
                    min_supported_build,
                    force_update,
                    published_at,
                    release_notes,
                    android_apk_url,
                    android_apk_path,
                    android_download_name,
                    ios_url,
                    updated_by,
                    created_at,
                    updated_at
                """,
                (
                    SINGLETON_KEY,
                    latest_version,
                    latest_build,
                    min_supported_build,
                    force_update,
                    published_at,
                    release_notes,
                    android_apk_url,
                    android_apk_path,
                    android_download_name,
                    ios_url,
                    updated_by,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        normalized = self._normalize_row(row)
        if normalized is None:
            raise RuntimeError("failed to save app update settings")
        return normalized

    @staticmethod
    def _normalize_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None

        return {
            "singleton_key": row.get("singleton_key") or SINGLETON_KEY,
            "latest_version": row.get("latest_version"),
            "latest_build": int(row.get("latest_build") or 0),
            "min_supported_build": int(row.get("min_supported_build") or 0),
            "force_update": bool(row.get("force_update")),
            "published_at": row.get("published_at"),
            "release_notes": list(row.get("release_notes") or []),
            "android_apk_url": row.get("android_apk_url"),
            "android_apk_path": row.get("android_apk_path"),
            "android_download_name": row.get("android_download_name"),
            "ios_url": row.get("ios_url"),
            "updated_by": row.get("updated_by"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }


__all__ = ["AppUpdateRepository"]
