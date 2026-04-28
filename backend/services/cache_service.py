from __future__ import annotations

import hashlib
import json
from typing import Any
from uuid import UUID

from flask import current_app

DEFAULT_VERSION = 0
DASHBOARD_TTL_SECONDS = 60 * 60 * 6
RECOMMEND_TTL_SECONDS = 60 * 60 * 6
RECOMMEND_STRATEGY_VERSION = "library-only-ai-v3"
GLOBAL_RECIPE_LIBRARY_VERSION_KEY = "nutrition:recipe-library:global-version"


def get_user_state_version(user_id: UUID | str) -> int:
    client = _get_redis_client()
    if client is None:
        return DEFAULT_VERSION

    try:
        value = client.get(_state_version_key(user_id))
        return int(value) if value is not None else DEFAULT_VERSION
    except Exception:
        return DEFAULT_VERSION


def bump_user_state_version(user_id: UUID | str) -> int:
    client = _get_redis_client()
    if client is None:
        return DEFAULT_VERSION + 1

    try:
        return int(client.incr(_state_version_key(user_id)))
    except Exception:
        return DEFAULT_VERSION + 1


def get_global_recipe_library_version() -> int:
    client = _get_redis_client()
    if client is None:
        return DEFAULT_VERSION

    try:
        value = client.get(GLOBAL_RECIPE_LIBRARY_VERSION_KEY)
        return int(value) if value is not None else DEFAULT_VERSION
    except Exception:
        return DEFAULT_VERSION


def bump_global_recipe_library_version() -> int:
    client = _get_redis_client()
    if client is None:
        return DEFAULT_VERSION + 1

    try:
        return int(client.incr(GLOBAL_RECIPE_LIBRARY_VERSION_KEY))
    except Exception:
        return DEFAULT_VERSION + 1


def get_dashboard_today_cache(user_id: UUID | str, day: str, version: int) -> dict[str, Any] | None:
    return _get_json(_dashboard_today_key(user_id, day, version))


def set_dashboard_today_cache(user_id: UUID | str, day: str, version: int, payload: dict[str, Any]) -> None:
    _set_json(_dashboard_today_key(user_id, day, version), payload, DASHBOARD_TTL_SECONDS)


def get_recipe_recommend_cache(
    user_id: UUID | str,
    version: int,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    return _get_json(_recipe_recommend_key(user_id, version, payload))


def set_recipe_recommend_cache(
    user_id: UUID | str,
    version: int,
    payload: dict[str, Any],
    result: dict[str, Any],
) -> None:
    _set_json(_recipe_recommend_key(user_id, version, payload), result, RECOMMEND_TTL_SECONDS)


def _get_json(key: str) -> dict[str, Any] | None:
    client = _get_redis_client()
    if client is None:
        return None

    try:
        value = client.get(key)
        if value is None:
            return None
        if isinstance(value, bytes):
            value = value.decode("utf-8")
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _set_json(key: str, payload: dict[str, Any], ttl_seconds: int) -> None:
    client = _get_redis_client()
    if client is None:
        return

    try:
        client.setex(key, ttl_seconds, json.dumps(payload, ensure_ascii=False))
    except Exception:
        return


def _get_redis_client():
    try:
        return current_app.extensions.get("redis_client")
    except Exception:
        return None


def _state_version_key(user_id: UUID | str) -> str:
    return f"nutrition:state-version:{user_id}"


def _dashboard_today_key(user_id: UUID | str, day: str, version: int) -> str:
    return f"nutrition:dashboard:today:{user_id}:{day}:v{version}"


def _recipe_recommend_key(user_id: UUID | str, version: int, payload: dict[str, Any]) -> str:
    payload_hash = hashlib.sha256(
        json.dumps(_normalize_payload(payload), ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return f"nutrition:recommend:{user_id}:v{version}:{payload_hash}"


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    raw_ai_enhance = payload.get("ai_enhance")
    if isinstance(raw_ai_enhance, bool):
        ai_enhance = raw_ai_enhance
    elif raw_ai_enhance is None:
        ai_enhance = True
    else:
        normalized_flag = str(raw_ai_enhance).strip().lower()
        ai_enhance = True if not normalized_flag else normalized_flag in {"1", "true", "yes", "on"}

    normalized = {
        "strategy": RECOMMEND_STRATEGY_VERSION,
        "keyword": payload.get("keyword"),
        "tag": payload.get("tag"),
        "exclude_names": payload.get("exclude_names") if isinstance(payload.get("exclude_names"), list) else [],
        "refresh_round": payload.get("refresh_round") or 0,
        "ai_enhance": ai_enhance,
        "prefer_external": False,
        "library_only": True,
    }
    return normalized
