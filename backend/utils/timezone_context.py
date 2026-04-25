from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone, tzinfo
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

MAX_UTC_OFFSET_MINUTES = 14 * 60
OFFSET_HEADER = "X-Timezone-Offset-Minutes"
ZONE_HEADER = "X-Client-Timezone"


def _clamp_utc_offset_minutes(offset_minutes: int) -> int:
    return max(-MAX_UTC_OFFSET_MINUTES, min(MAX_UTC_OFFSET_MINUTES, offset_minutes))


def _safe_parse_int(raw: str | None) -> int | None:
    if raw is None:
        return None
    value = str(raw).strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _resolve_zone_name(request: Any) -> str | None:
    raw = str(request.headers.get(ZONE_HEADER) or "").strip()
    if not raw:
        return None
    try:
        ZoneInfo(raw)
    except ZoneInfoNotFoundError:
        return None
    return raw


def _resolve_utc_offset_minutes(request: Any) -> int:
    # JS Date.getTimezoneOffset() 的定义是 UTC - 本地（分钟），例如中国时区通常为 -480。
    js_offset_minutes = _safe_parse_int(request.headers.get(OFFSET_HEADER))
    if js_offset_minutes is None:
        return 0
    utc_offset_minutes = -js_offset_minutes
    return _clamp_utc_offset_minutes(utc_offset_minutes)


def resolve_request_tzinfo(request: Any) -> tzinfo:
    zone_name = _resolve_zone_name(request)
    if zone_name:
        try:
            return ZoneInfo(zone_name)
        except ZoneInfoNotFoundError:
            pass
    return timezone(timedelta(minutes=_resolve_utc_offset_minutes(request)))


def get_request_local_date(request: Any) -> date:
    return datetime.now(resolve_request_tzinfo(request)).date()


def get_request_timezone_cache_key(request: Any) -> str:
    zone_name = _resolve_zone_name(request)
    if zone_name:
        return zone_name

    offset_minutes = _resolve_utc_offset_minutes(request)
    sign = "+" if offset_minutes >= 0 else "-"
    abs_minutes = abs(offset_minutes)
    hours = abs_minutes // 60
    minutes = abs_minutes % 60
    return f"offset:{sign}{hours:02d}:{minutes:02d}"


def local_day_to_utc_range(day: date, tz: tzinfo) -> tuple[datetime, datetime]:
    start_local = datetime.combine(day, time.min, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def local_date_span_to_utc_range(start: date, end: date, tz: tzinfo) -> tuple[datetime, datetime]:
    start_utc, _ = local_day_to_utc_range(start, tz)
    end_next_day = end + timedelta(days=1)
    end_utc, _ = local_day_to_utc_range(end_next_day, tz)
    return start_utc, end_utc


def to_local_date(value: datetime, tz: tzinfo) -> date:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(tz).date()


__all__ = [
    "get_request_local_date",
    "get_request_timezone_cache_key",
    "local_date_span_to_utc_range",
    "local_day_to_utc_range",
    "resolve_request_tzinfo",
    "to_local_date",
]
