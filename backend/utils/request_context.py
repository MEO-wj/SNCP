from __future__ import annotations

from typing import Any
from uuid import UUID


def get_request_user_id(request: Any) -> UUID | None:
    claims = getattr(request, "auth_claims", {}) or {}
    raw = claims.get("sub")
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except (TypeError, ValueError):
        return None


__all__ = ["get_request_user_id"]
