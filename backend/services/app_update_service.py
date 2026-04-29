from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from flask import url_for

from backend.config import Config
from backend.repository.app_update_repository import AppUpdateRepository


@dataclass(frozen=True)
class AppUpdateConfigSnapshot:
    source: str
    latest_version: str | None
    latest_build: int
    min_supported_build: int
    force_update: bool
    published_at: str | None
    release_notes: list[str]
    android_apk_url: str | None
    android_apk_path: str | None
    android_release_dir: str | None
    android_download_name: str | None
    ios_url: str | None
    updated_at: str | None


@dataclass(frozen=True)
class AndroidUpdateRelease:
    ready: bool
    latest_version: str | None
    latest_build: int
    min_supported_build: int
    force_update: bool
    published_at: str | None
    release_notes: list[str]
    download_url: str | None
    download_mode: str | None
    download_name: str | None
    reason: str | None
    source: str
    android_apk_url: str | None
    android_apk_path: str | None
    android_release_dir: str | None
    ios_url: str | None
    updated_at: str | None


@dataclass(frozen=True)
class AndroidDownloadTarget:
    local_path: Path | None
    redirect_url: str | None
    download_name: str | None


class AppUpdateService:
    def __init__(self, config: Config, repository: AppUpdateRepository | None = None) -> None:
        self.config = config
        self.repository = repository or AppUpdateRepository()

    def build_android_check_payload(
        self,
        current_build: int | None = None,
        current_version: str | None = None,
        external_download_url: bool = False,
    ) -> dict[str, Any]:
        release = self.get_android_release(external=external_download_url)
        should_update = bool(
            release.ready
            and current_build is not None
            and current_build < release.latest_build
        )
        must_update = bool(
            should_update
            and (
                release.force_update
                or (
                    release.min_supported_build > 0
                    and current_build is not None
                    and current_build < release.min_supported_build
                )
            )
        )

        return {
            "platform": "android",
            "update_enabled": release.ready,
            "current_version": current_version,
            "current_build": current_build,
            "latest_version": release.latest_version,
            "latest_build": release.latest_build,
            "min_supported_build": release.min_supported_build,
            "force_update": release.force_update,
            "should_update": should_update,
            "must_update": must_update,
            "published_at": release.published_at,
            "release_notes": release.release_notes,
            "download_url": release.download_url,
            "download_mode": release.download_mode,
            "download_name": release.download_name,
            "ios_url": release.ios_url,
            "message": release.reason,
        }

    def get_admin_settings_payload(self, external_download_url: bool = True) -> dict[str, Any]:
        snapshot = self._load_config_snapshot()
        release = self.get_android_release(external=external_download_url, snapshot=snapshot)
        return {
            "config": {
                "source": snapshot.source,
                "latest_version": snapshot.latest_version,
                "latest_build": snapshot.latest_build,
                "min_supported_build": snapshot.min_supported_build,
                "force_update": snapshot.force_update,
                "published_at": snapshot.published_at,
                "release_notes": snapshot.release_notes,
                "android_apk_url": snapshot.android_apk_url,
                "android_apk_path": snapshot.android_apk_path,
                "android_release_dir": snapshot.android_release_dir,
                "android_download_name": snapshot.android_download_name,
                "ios_url": snapshot.ios_url,
                "updated_at": snapshot.updated_at,
            },
            "resolved": {
                "update_enabled": release.ready,
                "download_url": release.download_url,
                "download_mode": release.download_mode,
                "download_name": release.download_name,
                "message": release.reason,
            },
        }

    def save_admin_settings(self, payload: dict[str, Any], updated_by: UUID | None = None) -> dict[str, Any]:
        latest_version = self._clean_nullable_string(payload.get("latest_version"))
        latest_build = self._parse_non_negative_int(payload.get("latest_build"))
        min_supported_build = self._parse_non_negative_int(payload.get("min_supported_build"))
        force_update = self._parse_bool(payload.get("force_update"))
        published_at = self._parse_nullable_datetime(payload.get("published_at"))
        release_notes = self._normalize_release_notes(payload.get("release_notes"))
        if len(release_notes) > 3:
            raise ValueError("更新说明最多填写 3 行")
        android_apk_url = self._clean_nullable_string(payload.get("android_apk_url"))
        android_apk_path = self._clean_nullable_string(payload.get("android_apk_path"))
        android_download_name = self._clean_download_name(payload.get("android_download_name"))
        ios_url = self._clean_nullable_string(payload.get("ios_url"))

        self.repository.upsert_current(
            latest_version=latest_version,
            latest_build=latest_build,
            min_supported_build=min_supported_build,
            force_update=force_update,
            published_at=published_at,
            release_notes=release_notes,
            android_apk_url=android_apk_url,
            android_apk_path=android_apk_path,
            android_download_name=android_download_name,
            ios_url=ios_url,
            updated_by=updated_by,
        )
        return self.get_admin_settings_payload(external_download_url=True)

    def revoke_current_release(self, updated_by: UUID | None = None) -> dict[str, Any]:
        snapshot = self._load_config_snapshot()
        self.repository.upsert_current(
            latest_version=None,
            latest_build=0,
            min_supported_build=0,
            force_update=False,
            published_at=None,
            release_notes=[],
            android_apk_url=snapshot.android_apk_url,
            android_apk_path=snapshot.android_apk_path,
            android_download_name=snapshot.android_download_name,
            ios_url=snapshot.ios_url,
            updated_by=updated_by,
        )
        payload = self.get_admin_settings_payload(external_download_url=True)
        payload["message"] = "已撤销本次更新，当前不会再向用户弹出安装包升级提示"
        return payload

    def get_android_release(
        self,
        external: bool = False,
        snapshot: AppUpdateConfigSnapshot | None = None,
    ) -> AndroidUpdateRelease:
        effective = snapshot or self._load_config_snapshot()

        if not effective.latest_version:
            return AndroidUpdateRelease(
                ready=False,
                latest_version=None,
                latest_build=effective.latest_build,
                min_supported_build=effective.min_supported_build,
                force_update=effective.force_update,
                published_at=effective.published_at,
                release_notes=effective.release_notes,
                download_url=None,
                download_mode=None,
                download_name=effective.android_download_name,
                reason="未配置最新版本号",
                source=effective.source,
                android_apk_url=effective.android_apk_url,
                android_apk_path=effective.android_apk_path,
                android_release_dir=effective.android_release_dir,
                ios_url=effective.ios_url,
                updated_at=effective.updated_at,
            )

        if effective.latest_build <= 0:
            return AndroidUpdateRelease(
                ready=False,
                latest_version=effective.latest_version,
                latest_build=effective.latest_build,
                min_supported_build=effective.min_supported_build,
                force_update=effective.force_update,
                published_at=effective.published_at,
                release_notes=effective.release_notes,
                download_url=None,
                download_mode=None,
                download_name=effective.android_download_name,
                reason="未配置有效的最新构建号",
                source=effective.source,
                android_apk_url=effective.android_apk_url,
                android_apk_path=effective.android_apk_path,
                android_release_dir=effective.android_release_dir,
                ios_url=effective.ios_url,
                updated_at=effective.updated_at,
            )

        target = self.get_android_download_target(snapshot=effective)
        if target.local_path is not None:
            return AndroidUpdateRelease(
                ready=True,
                latest_version=effective.latest_version,
                latest_build=effective.latest_build,
                min_supported_build=effective.min_supported_build,
                force_update=effective.force_update,
                published_at=effective.published_at,
                release_notes=effective.release_notes,
                download_url=url_for("update.download_android_apk", _external=external),
                download_mode="hosted",
                download_name=target.download_name or target.local_path.name,
                reason=None,
                source=effective.source,
                android_apk_url=effective.android_apk_url,
                android_apk_path=effective.android_apk_path,
                android_release_dir=effective.android_release_dir,
                ios_url=effective.ios_url,
                updated_at=effective.updated_at,
            )

        if target.redirect_url:
            return AndroidUpdateRelease(
                ready=True,
                latest_version=effective.latest_version,
                latest_build=effective.latest_build,
                min_supported_build=effective.min_supported_build,
                force_update=effective.force_update,
                published_at=effective.published_at,
                release_notes=effective.release_notes,
                download_url=target.redirect_url,
                download_mode="redirect",
                download_name=target.download_name,
                reason=None,
                source=effective.source,
                android_apk_url=effective.android_apk_url,
                android_apk_path=effective.android_apk_path,
                android_release_dir=effective.android_release_dir,
                ios_url=effective.ios_url,
                updated_at=effective.updated_at,
            )

        return AndroidUpdateRelease(
            ready=False,
            latest_version=effective.latest_version,
            latest_build=effective.latest_build,
            min_supported_build=effective.min_supported_build,
            force_update=effective.force_update,
            published_at=effective.published_at,
            release_notes=effective.release_notes,
            download_url=None,
            download_mode=None,
            download_name=effective.android_download_name,
            reason=self._build_missing_download_reason(effective),
            source=effective.source,
            android_apk_url=effective.android_apk_url,
            android_apk_path=effective.android_apk_path,
            android_release_dir=effective.android_release_dir,
            ios_url=effective.ios_url,
            updated_at=effective.updated_at,
        )

    def get_android_download_target(
        self,
        snapshot: AppUpdateConfigSnapshot | None = None,
    ) -> AndroidDownloadTarget:
        effective = snapshot or self._load_config_snapshot()
        download_name = self._clean_nullable_string(effective.android_download_name)
        release_dir = self._resolve_download_path(effective.android_release_dir)

        if release_dir is not None and download_name:
            try:
                fixed_path = self._resolve_release_file_path(release_dir, download_name)
            except ValueError:
                fixed_path = None
            if fixed_path is not None and fixed_path.is_file():
                return AndroidDownloadTarget(
                    local_path=fixed_path,
                    redirect_url=None,
                    download_name=download_name,
                )

        local_path = self._resolve_download_path(effective.android_apk_path)

        if local_path is not None and local_path.is_file():
            return AndroidDownloadTarget(
                local_path=local_path,
                redirect_url=None,
                download_name=download_name or local_path.name,
            )

        redirect_url = self._clean_nullable_string(effective.android_apk_url)
        if redirect_url:
            return AndroidDownloadTarget(
                local_path=None,
                redirect_url=redirect_url,
                download_name=download_name,
            )

        return AndroidDownloadTarget(
            local_path=None,
            redirect_url=None,
            download_name=download_name,
        )

    def _resolve_release_file_path(self, release_dir: Path, download_name: str) -> Path:
        root = release_dir.resolve()
        candidate = (root / download_name).resolve()
        try:
            candidate.relative_to(root)
        except ValueError as exc:
            raise ValueError("下载文件名只需要填写文件名，不要包含目录路径") from exc
        return candidate

    def _build_missing_download_reason(self, effective: AppUpdateConfigSnapshot) -> str:
        release_dir = self._resolve_download_path(effective.android_release_dir)
        download_name = self._clean_nullable_string(effective.android_download_name)
        local_path = self._resolve_download_path(effective.android_apk_path)

        if release_dir is not None and download_name:
            try:
                fixed_path = self._resolve_release_file_path(release_dir, download_name)
            except ValueError:
                return "下载文件名无效，请只填写文件名，不要包含目录路径"
            return f"固定目录中未找到 APK：{fixed_path}"

        if local_path is not None:
            return f"本地 APK 文件不存在：{local_path}"

        if release_dir is not None:
            return f"固定目录 {release_dir} 下尚未填写 APK 文件名"

        return "未配置可用的安卓安装包下载地址，或本地 APK 文件不存在"

    def _load_config_snapshot(self) -> AppUpdateConfigSnapshot:
        row = self.repository.get_current()
        if row:
            return AppUpdateConfigSnapshot(
                source="database",
                latest_version=self._clean_nullable_string(row.get("latest_version")),
                latest_build=int(row.get("latest_build") or 0),
                min_supported_build=int(row.get("min_supported_build") or 0),
                force_update=bool(row.get("force_update")),
                published_at=self._serialize_datetime(row.get("published_at")),
                release_notes=self._normalize_release_notes(row.get("release_notes")),
                android_apk_url=self._clean_nullable_string(row.get("android_apk_url")),
                android_apk_path=self._clean_nullable_string(row.get("android_apk_path")),
                android_release_dir=self._clean_nullable_string(str(self.config.app_update_android_release_dir)),
                android_download_name=self._clean_nullable_string(row.get("android_download_name")),
                ios_url=self._clean_nullable_string(row.get("ios_url")),
                updated_at=self._serialize_datetime(row.get("updated_at")),
            )

        env_path = None
        if self.config.app_update_android_apk_path:
            env_path = str(self.config.app_update_android_apk_path)

        return AppUpdateConfigSnapshot(
            source="env",
            latest_version=self._clean_nullable_string(self.config.app_update_latest_version),
            latest_build=self.config.app_update_latest_build,
            min_supported_build=self.config.app_update_min_supported_build,
            force_update=self.config.app_update_force_update,
            published_at=self._clean_nullable_string(self.config.app_update_published_at),
            release_notes=self._normalize_release_notes(self.config.app_update_release_notes),
            android_apk_url=self._clean_nullable_string(self.config.app_update_android_apk_url),
            android_apk_path=env_path,
            android_release_dir=self._clean_nullable_string(str(self.config.app_update_android_release_dir)),
            android_download_name=self._clean_nullable_string(self.config.app_update_android_download_name),
            ios_url=self._clean_nullable_string(self.config.app_update_ios_url),
            updated_at=None,
        )

    def _resolve_download_path(self, raw_path: str | Path | None) -> Path | None:
        if raw_path is None:
            return None
        if isinstance(raw_path, Path):
            path = raw_path
        else:
            text = str(raw_path).strip()
            if not text:
                return None
            path = Path(text)
        if not path.is_absolute():
            path = (self.config.project_root / path).resolve()
        return path

    @staticmethod
    def _clean_nullable_string(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @classmethod
    def _clean_download_name(cls, value: Any) -> str | None:
        text = cls._clean_nullable_string(value)
        if text is None:
            return None
        if "/" in text or "\\" in text:
            raise ValueError("下载文件名只需要填写文件名，不要包含目录路径")
        return text

    @staticmethod
    def _parse_non_negative_int(value: Any) -> int:
        if value in (None, ""):
            return 0
        parsed = int(str(value).strip())
        if parsed < 0:
            raise ValueError("数值不能小于 0")
        return parsed

    @staticmethod
    def _parse_bool(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        normalized = str(value or "").strip().lower()
        return normalized in {"1", "true", "yes", "on"}

    @classmethod
    def _parse_nullable_datetime(cls, value: Any) -> datetime | None:
        text = cls._clean_nullable_string(value)
        if not text:
            return None
        normalized = text.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError as exc:
            raise ValueError("发布时间必须是合法的 ISO 时间") from exc

    @classmethod
    def _normalize_release_notes(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            raw_items = value
        else:
            raw_items = str(value).splitlines()
        notes = [cls._clean_nullable_string(item) for item in raw_items]
        return [note for note in notes if note]

    @staticmethod
    def _serialize_datetime(value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        text = str(value).strip()
        return text or None
