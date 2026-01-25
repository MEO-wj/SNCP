from __future__ import annotations

from typing import Any
from uuid import UUID

from backend.db import db_session


class ReminderRepository:
    def list_reminders(self, user_id: UUID) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, reminder_type, time_of_day, repeat_days, enabled, note,
                       created_at, updated_at
                FROM reminders
                WHERE user_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (user_id,),
            )
            return cur.fetchall()

    def create_reminder(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reminders (
                    user_id, reminder_type, time_of_day, repeat_days, enabled, note,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, now(), now())
                RETURNING id, user_id, reminder_type, time_of_day, repeat_days, enabled, note,
                          created_at, updated_at
                """,
                (
                    user_id,
                    payload.get("reminder_type"),
                    payload.get("time_of_day"),
                    payload.get("repeat_days") or [],
                    bool(payload.get("enabled", True)),
                    payload.get("note"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def update_reminder(self, reminder_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE reminders
                SET reminder_type = %s,
                    time_of_day = %s,
                    repeat_days = %s,
                    enabled = %s,
                    note = %s,
                    updated_at = now()
                WHERE id = %s
                RETURNING id, user_id, reminder_type, time_of_day, repeat_days, enabled, note,
                          created_at, updated_at
                """,
                (
                    payload.get("reminder_type"),
                    payload.get("time_of_day"),
                    payload.get("repeat_days") or [],
                    bool(payload.get("enabled", True)),
                    payload.get("note"),
                    reminder_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def delete_reminder(self, reminder_id: int) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM reminders WHERE id = %s", (reminder_id,))
            deleted = cur.rowcount > 0
            conn.commit()
        return deleted


__all__ = ["ReminderRepository"]
