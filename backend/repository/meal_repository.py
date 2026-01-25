from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from backend.db import db_session


class MealRepository:
    def create_meal(
        self,
        user_id: UUID,
        meal_type: str,
        eaten_at: datetime,
        note: str | None,
        items: list[dict[str, Any]],
    ) -> int:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO meals (user_id, meal_type, eaten_at, note)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, meal_type, eaten_at, note),
            )
            meal_id = cur.fetchone()["id"]
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
                        item.get("nutrition") or {},
                    ),
                )
            conn.commit()
        return meal_id

    def list_meals_by_date(self, user_id: UUID, day: date) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, meal_type, eaten_at, note, created_at
                FROM meals
                WHERE user_id = %s AND eaten_at::date = %s
                ORDER BY eaten_at DESC
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

        result = []
        for meal in meals:
            result.append(
                {
                    **meal,
                    "items": items_by_meal.get(meal["id"], []),
                }
            )
        return result

    def list_meals_by_range(
        self, user_id: UUID, start: date, end: date
    ) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, meal_type, eaten_at, note, created_at
                FROM meals
                WHERE user_id = %s AND eaten_at::date BETWEEN %s AND %s
                ORDER BY eaten_at DESC
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

        result = []
        for meal in meals:
            result.append(
                {
                    **meal,
                    "items": items_by_meal.get(meal["id"], []),
                }
            )
        return result

    def get_meal_items_by_range(
        self, user_id: UUID, start: date, end: date
    ) -> list[dict[str, Any]]:
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
        """为当天创建空白记录入口，方便前端显示。"""
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
                (user_id, "breakfast", start + timedelta(hours=8), "自动创建"),
            )
            conn.commit()


__all__ = ["MealRepository"]
