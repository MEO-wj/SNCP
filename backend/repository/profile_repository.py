from __future__ import annotations

from typing import Any
from uuid import UUID

from backend.db import db_session


class ProfileRepository:
    def get_profile(self, user_id: UUID) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, gender, birth_year, height_cm, weight_kg,
                       chronic_conditions, allergies, taste_preferences,
                       created_at, updated_at
                FROM health_profiles
                WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return row

    def upsert_profile(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO health_profiles (
                    user_id, gender, birth_year, height_cm, weight_kg,
                    chronic_conditions, allergies, taste_preferences, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                ON CONFLICT (user_id)
                DO UPDATE SET
                    gender = EXCLUDED.gender,
                    birth_year = EXCLUDED.birth_year,
                    height_cm = EXCLUDED.height_cm,
                    weight_kg = EXCLUDED.weight_kg,
                    chronic_conditions = EXCLUDED.chronic_conditions,
                    allergies = EXCLUDED.allergies,
                    taste_preferences = EXCLUDED.taste_preferences,
                    updated_at = now()
                RETURNING user_id, gender, birth_year, height_cm, weight_kg,
                          chronic_conditions, allergies, taste_preferences, created_at, updated_at
                """,
                (
                    user_id,
                    payload.get("gender"),
                    payload.get("birth_year"),
                    payload.get("height_cm"),
                    payload.get("weight_kg"),
                    payload.get("chronic_conditions") or [],
                    payload.get("allergies") or [],
                    payload.get("taste_preferences") or [],
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def get_goals(self, user_id: UUID) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, calories_min, calories_max, protein_min, protein_max,
                       fat_min, fat_max, carbs_min, carbs_max, sodium_max, sugar_max,
                       created_at, updated_at
                FROM nutrition_goals
                WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return row

    def upsert_goals(self, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO nutrition_goals (
                    user_id, calories_min, calories_max, protein_min, protein_max,
                    fat_min, fat_max, carbs_min, carbs_max, sodium_max, sugar_max,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                ON CONFLICT (user_id)
                DO UPDATE SET
                    calories_min = EXCLUDED.calories_min,
                    calories_max = EXCLUDED.calories_max,
                    protein_min = EXCLUDED.protein_min,
                    protein_max = EXCLUDED.protein_max,
                    fat_min = EXCLUDED.fat_min,
                    fat_max = EXCLUDED.fat_max,
                    carbs_min = EXCLUDED.carbs_min,
                    carbs_max = EXCLUDED.carbs_max,
                    sodium_max = EXCLUDED.sodium_max,
                    sugar_max = EXCLUDED.sugar_max,
                    updated_at = now()
                RETURNING user_id, calories_min, calories_max, protein_min, protein_max,
                          fat_min, fat_max, carbs_min, carbs_max, sodium_max, sugar_max,
                          created_at, updated_at
                """,
                (
                    user_id,
                    payload.get("calories_min"),
                    payload.get("calories_max"),
                    payload.get("protein_min"),
                    payload.get("protein_max"),
                    payload.get("fat_min"),
                    payload.get("fat_max"),
                    payload.get("carbs_min"),
                    payload.get("carbs_max"),
                    payload.get("sodium_max"),
                    payload.get("sugar_max"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row


__all__ = ["ProfileRepository"]
