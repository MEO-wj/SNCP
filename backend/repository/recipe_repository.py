from __future__ import annotations

from typing import Any

from backend.db import db_session


class RecipeRepository:
    def list_recipes(self, keyword: str | None = None, tag: str | None = None) -> list[dict[str, Any]]:
        keyword = (keyword or "").strip()
        tag = (tag or "").strip()
        params: list[Any] = []
        clauses = []
        if keyword:
            clauses.append("name ILIKE %s")
            params.append(f"%{keyword}%")
        if tag:
            clauses.append("%s = ANY(tags)")
            params.append(tag)
        where = " AND ".join(clauses) if clauses else "TRUE"
        sql = f"""
            SELECT id, name, cuisine, tags, ingredients, steps, nutrition, suitable_for,
                   created_at, updated_at
            FROM recipes
            WHERE {where}
            ORDER BY updated_at DESC, id DESC
        """
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    def create_recipe(self, payload: dict[str, Any]) -> dict[str, Any]:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recipes (
                    name, cuisine, tags, ingredients, steps, nutrition, suitable_for, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, now(), now())
                RETURNING id, name, cuisine, tags, ingredients, steps, nutrition, suitable_for,
                          created_at, updated_at
                """,
                (
                    payload.get("name"),
                    payload.get("cuisine"),
                    payload.get("tags") or [],
                    payload.get("ingredients") or [],
                    payload.get("steps") or [],
                    payload.get("nutrition") or {},
                    payload.get("suitable_for") or [],
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def update_recipe(self, recipe_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipes
                SET name = %s,
                    cuisine = %s,
                    tags = %s,
                    ingredients = %s,
                    steps = %s,
                    nutrition = %s,
                    suitable_for = %s,
                    updated_at = now()
                WHERE id = %s
                RETURNING id, name, cuisine, tags, ingredients, steps, nutrition, suitable_for,
                          created_at, updated_at
                """,
                (
                    payload.get("name"),
                    payload.get("cuisine"),
                    payload.get("tags") or [],
                    payload.get("ingredients") or [],
                    payload.get("steps") or [],
                    payload.get("nutrition") or {},
                    payload.get("suitable_for") or [],
                    recipe_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def delete_recipe(self, recipe_id: int) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM recipes WHERE id = %s", (recipe_id,))
            deleted = cur.rowcount > 0
            conn.commit()
        return deleted


__all__ = ["RecipeRepository"]
