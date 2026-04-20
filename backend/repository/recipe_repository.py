from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from backend.data.default_recipes import DEFAULT_RECIPES
from backend.db import db_session


class RecipeRepository:
    def list_recipes(
        self,
        user_id: UUID | None,
        keyword: str | None = None,
        tag: str | None = None,
    ) -> list[dict[str, Any]]:
        db_recipes = self._list_db_recipes(user_id)
        merged = self._merge_default_recipes(db_recipes)
        return [recipe for recipe in merged if self._matches_recipe(recipe, keyword=keyword, tag=tag)]

    def create_recipe(self, user_id: UUID, payload: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        existing_recipe = self._find_existing_recipe(user_id, str(payload.get("name") or ""))
        if existing_recipe:
            return existing_recipe, False

        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recipes (
                    user_id, name, cuisine, cover_url, source_url, source_provider,
                    tags, ingredients, steps, nutrition, suitable_for, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                RETURNING id, user_id, name, cuisine, cover_url, source_url, source_provider,
                          tags, ingredients, steps, nutrition, suitable_for,
                          created_at, updated_at
                """,
                (
                    user_id,
                    payload.get("name"),
                    payload.get("cuisine"),
                    payload.get("cover_url"),
                    payload.get("source_url"),
                    payload.get("source_provider"),
                    payload.get("tags") or [],
                    Jsonb(payload.get("ingredients") or []),
                    Jsonb(payload.get("steps") or []),
                    Jsonb(payload.get("nutrition") or {}),
                    payload.get("suitable_for") or [],
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row, True

    def update_recipe(self, recipe_id: int, user_id: UUID, payload: dict[str, Any]) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipes
                SET name = %s,
                    cuisine = %s,
                    cover_url = %s,
                    source_url = %s,
                    source_provider = %s,
                    tags = %s,
                    ingredients = %s,
                    steps = %s,
                    nutrition = %s,
                    suitable_for = %s,
                    updated_at = now()
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, name, cuisine, cover_url, source_url, source_provider,
                          tags, ingredients, steps, nutrition, suitable_for,
                          created_at, updated_at
                """,
                (
                    payload.get("name"),
                    payload.get("cuisine"),
                    payload.get("cover_url"),
                    payload.get("source_url"),
                    payload.get("source_provider"),
                    payload.get("tags") or [],
                    Jsonb(payload.get("ingredients") or []),
                    Jsonb(payload.get("steps") or []),
                    Jsonb(payload.get("nutrition") or {}),
                    payload.get("suitable_for") or [],
                    recipe_id,
                    user_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return row

    def delete_recipe(self, recipe_id: int, user_id: UUID) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM recipes WHERE id = %s AND user_id = %s", (recipe_id, user_id))
            deleted = cur.rowcount > 0
            conn.commit()
        return deleted

    def _list_db_recipes(self, user_id: UUID | None) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
            if user_id:
                cur.execute(
                    """
                    SELECT id, user_id, name, cuisine, cover_url, source_url, source_provider,
                           tags, ingredients, steps, nutrition, suitable_for,
                           created_at, updated_at
                    FROM recipes
                    WHERE user_id = %s OR user_id IS NULL
                    ORDER BY updated_at DESC, id DESC
                    """,
                    (user_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, user_id, name, cuisine, cover_url, source_url, source_provider,
                           tags, ingredients, steps, nutrition, suitable_for,
                           created_at, updated_at
                    FROM recipes
                    WHERE user_id IS NULL
                    ORDER BY updated_at DESC, id DESC
                    """
                )
            return cur.fetchall()

    def _find_existing_recipe(self, user_id: UUID, name: str) -> dict[str, Any] | None:
        normalized_name = self._normalize_name(name)
        if not normalized_name:
            return None

        recipes = self.list_recipes(user_id)
        for recipe in recipes:
            if self._normalize_name(str(recipe.get("name") or "")) == normalized_name:
                return recipe
        return None

    @staticmethod
    def _merge_default_recipes(db_recipes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        existing_names = {
            RecipeRepository._normalize_name(str(recipe.get("name") or ""))
            for recipe in db_recipes
            if recipe.get("name")
        }
        builtin_recipes = [
            recipe.copy()
            for recipe in DEFAULT_RECIPES
            if RecipeRepository._normalize_name(str(recipe.get("name") or "")) not in existing_names
        ]
        return builtin_recipes + db_recipes

    @staticmethod
    def _matches_recipe(recipe: dict[str, Any], keyword: str | None = None, tag: str | None = None) -> bool:
        keyword = (keyword or "").strip().lower()
        tag = (tag or "").strip().lower()

        tags = [str(item).strip() for item in (recipe.get("tags") or []) if str(item).strip()]
        suitable_for = [str(item).strip() for item in (recipe.get("suitable_for") or []) if str(item).strip()]
        ingredients = recipe.get("ingredients") or []
        ingredient_names: list[str] = []

        for item in ingredients:
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                if name:
                    ingredient_names.append(name)
            elif item:
                ingredient_names.append(str(item).strip())

        if tag and tag not in {item.lower() for item in tags}:
            return False

        if not keyword:
            return True

        searchable_text = " ".join(
            [
                str(recipe.get("name") or ""),
                str(recipe.get("cuisine") or ""),
                *tags,
                *suitable_for,
                *ingredient_names,
            ]
        ).lower()
        return keyword in searchable_text

    @staticmethod
    def _normalize_name(name: str) -> str:
        return "".join(name.split()).lower()


__all__ = ["RecipeRepository"]
