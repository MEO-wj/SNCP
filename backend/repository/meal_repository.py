from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from backend.db import db_session


class MealRepository:
    def create_meal(
        self,
        user_id: UUID,
        meal_type: str,
        eaten_at: datetime,
        client_request_id: str | None,
        note: str | None,
        items: list[dict[str, Any]],
    ) -> tuple[int, bool]:
        with db_session() as conn, conn.cursor() as cur:
            created = True

            if client_request_id:
                cur.execute(
                    """
                    INSERT INTO meals (user_id, meal_type, eaten_at, client_request_id, note)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, client_request_id) DO NOTHING
                    RETURNING id
                    """,
                    (user_id, meal_type, eaten_at, client_request_id, note),
                )
                inserted = cur.fetchone()
                if inserted:
                    meal_id = inserted["id"]
                else:
                    created = False
                    cur.execute(
                        """
                        SELECT id
                        FROM meals
                        WHERE user_id = %s AND client_request_id = %s
                        """,
                        (user_id, client_request_id),
                    )
                    existing = cur.fetchone()
                    if not existing:
                        raise RuntimeError("failed to resolve existing meal after idempotent insert")
                    meal_id = existing["id"]
            else:
                cur.execute(
                    """
                    INSERT INTO meals (user_id, meal_type, eaten_at, note)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, meal_type, eaten_at, note),
                )
                meal_id = cur.fetchone()["id"]

            if created:
                for item in items:
                    cur.execute(
                        """
                        INSERT INTO meal_items (
                            meal_id, food_name, food_category, weight_g, source, nutrition
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            meal_id,
                            item.get("food_name"),
                            item.get("food_category"),
                            item.get("weight_g"),
                            item.get("source"),
                            Jsonb(item.get("nutrition") or {}),
                        ),
                    )
            conn.commit()

        return meal_id, created

    def delete_meal(self, user_id: UUID, meal_id: int) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM meals
                WHERE id = %s AND user_id = %s
                RETURNING id
                """,
                (meal_id, user_id),
            )
            deleted = cur.fetchone()
            conn.commit()

        return deleted is not None

    def list_meals_by_date(self, user_id: UUID, day: date) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, meal_type, eaten_at, client_request_id, note, created_at
                FROM meals
                WHERE user_id = %s AND eaten_at::date = %s
                ORDER BY eaten_at DESC, id DESC
                """,
                (user_id, day),
            )
            meals = cur.fetchall()
            if not meals:
                return []

            meal_ids = [row["id"] for row in meals]
            cur.execute(
                """
                SELECT id, meal_id, food_name, food_category, weight_g, source, nutrition, created_at
                FROM meal_items
                WHERE meal_id = ANY(%s)
                ORDER BY id ASC
                """,
                (meal_ids,),
            )
            items = cur.fetchall()

        items_by_meal: dict[int, list[dict[str, Any]]] = {}
        for item in items:
            items_by_meal.setdefault(item["meal_id"], []).append(item)

        return [{**meal, "items": items_by_meal.get(meal["id"], [])} for meal in meals]

    def list_meals_by_range(self, user_id: UUID, start: date, end: date) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, meal_type, eaten_at, client_request_id, note, created_at
                FROM meals
                WHERE user_id = %s AND eaten_at::date BETWEEN %s AND %s
                ORDER BY eaten_at DESC, id DESC
                """,
                (user_id, start, end),
            )
            meals = cur.fetchall()
            if not meals:
                return []

            meal_ids = [row["id"] for row in meals]
            cur.execute(
                """
                SELECT id, meal_id, food_name, food_category, weight_g, source, nutrition, created_at
                FROM meal_items
                WHERE meal_id = ANY(%s)
                ORDER BY id ASC
                """,
                (meal_ids,),
            )
            items = cur.fetchall()

        items_by_meal: dict[int, list[dict[str, Any]]] = {}
        for item in items:
            items_by_meal.setdefault(item["meal_id"], []).append(item)

        return [{**meal, "items": items_by_meal.get(meal["id"], [])} for meal in meals]

    def get_meal_items_by_range(self, user_id: UUID, start: date, end: date) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT mi.id, mi.meal_id, mi.food_name, mi.food_category, mi.weight_g, mi.source, mi.nutrition,
                       m.eaten_at
                FROM meal_items mi
                JOIN meals m ON mi.meal_id = m.id
                WHERE m.user_id = %s AND m.eaten_at::date BETWEEN %s AND %s
                ORDER BY m.eaten_at DESC, mi.id ASC
                """,
                (user_id, start, end),
            )
            return cur.fetchall()

    def ensure_default_meal(self, user_id: UUID, day: date) -> None:
        start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(days=1)

        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM meals
                WHERE user_id = %s AND eaten_at >= %s AND eaten_at < %s
                LIMIT 1
                """,
                (user_id, start, end),
            )
            exists = cur.fetchone()
            if exists:
                return

            cur.execute(
                """
                INSERT INTO meals (user_id, meal_type, eaten_at, note)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, "breakfast", start + timedelta(hours=8), "auto-created"),
            )
            conn.commit()


__all__ = ["MealRepository"]
