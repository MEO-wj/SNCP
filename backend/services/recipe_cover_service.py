from __future__ import annotations

import base64
import binascii
import re
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


MAX_COVER_BYTES = 6 * 1024 * 1024
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "static" / "uploads" / "recipe-covers"
DATA_URL_PATTERN = re.compile(r"^data:(image/(?:jpeg|jpg|png|webp));base64,(.+)$", re.IGNORECASE | re.DOTALL)
MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def is_recipe_cover_data_url(value: Any) -> bool:
    return isinstance(value, str) and value.strip().lower().startswith("data:image/")


def normalize_recipe_cover_url(value: Any, public_base_url: str) -> str | None:
    cover_url = str(value or "").strip()
    if not cover_url:
        return None
    if cover_url.startswith("data:"):
        return cover_url
    if cover_url.startswith("http://") or cover_url.startswith("https://"):
        parsed = urlparse(cover_url)
        if parsed.hostname in {"localhost", "127.0.0.1", "10.0.2.2"} and parsed.path.startswith("/static/uploads/"):
            return f"{public_base_url.rstrip('/')}{parsed.path}"
        return cover_url
    if cover_url.startswith("/"):
        return f"{public_base_url.rstrip('/')}{cover_url}"
    return cover_url


def prepare_recipe_cover_payload(payload: dict[str, Any], public_base_url: str) -> dict[str, Any]:
    next_payload = dict(payload)
    cover_url = str(next_payload.get("cover_url") or "").strip()
    if is_recipe_cover_data_url(cover_url):
        next_payload["cover_url"] = store_recipe_cover_data_url(cover_url, public_base_url)
    elif cover_url:
        next_payload["cover_url"] = cover_url
    else:
        next_payload.pop("cover_url", None)
    return next_payload


def store_recipe_cover_data_url(data_url: str, public_base_url: str) -> str:
    matched = DATA_URL_PATTERN.match(data_url.strip())
    if not matched:
        raise ValueError("封面图片格式不支持，请使用 JPG、PNG 或 WebP 图片。")

    mime_type = matched.group(1).lower()
    extension = MIME_EXTENSIONS.get(mime_type)
    if not extension:
        raise ValueError("封面图片格式不支持，请使用 JPG、PNG 或 WebP 图片。")

    try:
        image_bytes = base64.b64decode(matched.group(2), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("封面图片数据无效，请重新选择图片。") from exc

    if len(image_bytes) > MAX_COVER_BYTES:
        raise ValueError("封面图片过大，请选择 6MB 以内的图片。")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(image_bytes)
    return f"/static/uploads/recipe-covers/{filename}"


__all__ = [
    "is_recipe_cover_data_url",
    "normalize_recipe_cover_url",
    "prepare_recipe_cover_payload",
    "store_recipe_cover_data_url",
]
