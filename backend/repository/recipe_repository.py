from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from psycopg.types.json import Jsonb

from backend.data.default_recipes import DEFAULT_RECIPES
from backend.db import db_session

RecipeScope = Literal["all", "local", "server"]


class RecipeRepository:
    def list_recipes(
        self,
        user_id: UUID | None,
        keyword: str | None = None,
        tag: str | None = None,
        scope: RecipeScope = "all",
    ) -> list[dict[str, Any]]:
        local_recipes = self._list_local_db_recipes(user_id) if user_id and scope in {"all", "local"} else []
        server_recipes = self._list_server_db_recipes() if scope in {"all", "server"} else []
        if scope == "local":
            # local 视图必须严格限定在当前用户的本地库，不应混入服务器默认食谱。
            merged = local_recipes
        elif scope == "server":
            merged = self._merge_server_default_recipes(server_recipes)
        else:
            merged = self._merge_server_default_recipes(server_recipes) + local_recipes
        return [recipe for recipe in merged if self._matches_recipe(recipe, keyword=keyword, tag=tag)]

    def create_recipe(
        self,
        user_id: UUID | None,
        payload: dict[str, Any],
        scope: Literal["local", "server"] = "local",
    ) -> tuple[dict[str, Any], bool]:
        owner_id = None if scope == "server" else user_id
        existing_recipe = self._find_existing_recipe(owner_id, str(payload.get("name") or ""), scope=scope)
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
                    owner_id,
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
        return self._normalize_recipe_row(row), True

    def update_recipe(
        self,
        recipe_id: int,
        user_id: UUID | None,
        payload: dict[str, Any],
        scope: Literal["local", "server"] = "local",
    ) -> dict[str, Any] | None:
        with db_session() as conn, conn.cursor() as cur:
            if scope == "server":
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
                    WHERE id = %s AND user_id IS NULL
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
                    ),
                )
            else:
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
        return self._normalize_recipe_row(row) if row else None

    def delete_recipe(
        self,
        recipe_id: int,
        user_id: UUID | None,
        scope: Literal["local", "server"] = "local",
    ) -> bool:
        with db_session() as conn, conn.cursor() as cur:
            if scope == "server":
                cur.execute("DELETE FROM recipes WHERE id = %s AND user_id IS NULL", (recipe_id,))
            else:
                cur.execute("DELETE FROM recipes WHERE id = %s AND user_id = %s", (recipe_id, user_id))
            deleted = cur.rowcount > 0
            conn.commit()
        return deleted

    def update_cover_url(self, recipe_id: int, cover_url: str | None) -> None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipes
                SET cover_url = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (cover_url, recipe_id),
            )
            conn.commit()

    def _list_local_db_recipes(self, user_id: UUID | None) -> list[dict[str, Any]]:
        if not user_id:
            return []
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, cuisine, cover_url, source_url, source_provider,
                       tags, ingredients, steps, nutrition, suitable_for,
                       created_at, updated_at
                FROM recipes
                WHERE user_id = %s
                ORDER BY updated_at DESC, id DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [self._normalize_recipe_row(row) for row in rows]

    def _list_server_db_recipes(self) -> list[dict[str, Any]]:
        with db_session() as conn, conn.cursor() as cur:
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
            rows = cur.fetchall()
        return [self._normalize_recipe_row(row) for row in rows]

    def _find_existing_recipe(self, owner_id: UUID | None, name: str, scope: Literal["local", "server"]) -> dict[str, Any] | None:
        normalized_name = self._normalize_name(name)
        if not normalized_name:
            return None

        recipes = self.list_recipes(owner_id, scope=scope)
        for recipe in recipes:
            if self._normalize_name(str(recipe.get("name") or "")) == normalized_name:
                return recipe
        return None

    @staticmethod
    def _merge_server_default_recipes(db_recipes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        existing_names = {
            RecipeRepository._normalize_name(str(recipe.get("name") or ""))
            for recipe in db_recipes
            if recipe.get("name")
        }
        builtin_recipes = [
            RecipeRepository._normalize_recipe_row({**recipe, "user_id": None})
            for recipe in DEFAULT_RECIPES
            if RecipeRepository._normalize_name(str(recipe.get("name") or "")) not in existing_names
        ]
        return builtin_recipes + db_recipes

    @staticmethod
    def _normalize_recipe_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None
        recipe = dict(row)
        recipe["source"] = "library"
        recipe["library_scope"] = "server" if recipe.get("user_id") is None else "local"
        return recipe

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


__all__ = ["RecipeRepository", "RecipeScope"]
