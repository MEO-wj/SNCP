from __future__ import annotations

from typing import Any

from backend.db import db_session


class HealthRuleRepository:
    def list_rules(self) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, tag, forbidden_foods, tips, created_at, updated_at
                FROM health_rules
                ORDER BY updated_at DESC, id DESC
                """
            )
            return cur.fetchall()

    def upsert_rule(self, tag: str, forbidden_foods: list[str], tips: list[str]) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO health_rules (tag, forbidden_foods, tips, created_at, updated_at)
                VALUES (%s, %s, %s, now(), now())
                ON CONFLICT (tag)
                DO UPDATE SET
                    forbidden_foods = EXCLUDED.forbidden_foods,
                    tips = EXCLUDED.tips,
                    updated_at = now()
                RETURNING id, tag, forbidden_foods, tips, created_at, updated_at
                """,
                (tag, forbidden_foods or [], tips or []),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def delete_rule(self, rule_id: int) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM health_rules WHERE id = %s", (rule_id,))
            deleted = cur.rowcount > 0
            conn.commit()
        return deleted


__all__ = ["HealthRuleRepository"]
