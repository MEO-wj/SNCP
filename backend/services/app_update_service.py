from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from flask import url_for

from backend.config import Config


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


@dataclass(frozen=True)
class AndroidDownloadTarget:
    local_path: Path | None
    redirect_url: str | None
    download_name: str | None


class AppUpdateService:
    def __init__(self, config: Config) -> None:
        self.config = config

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
            "ios_url": self.config.app_update_ios_url,
            "message": release.reason,
        }

    def get_android_release(self, external: bool = False) -> AndroidUpdateRelease:
        latest_version = (self.config.app_update_latest_version or "").strip() or None
        latest_build = self.config.app_update_latest_build
        min_supported_build = self.config.app_update_min_supported_build
        release_notes = list(self.config.app_update_release_notes)
        force_update = self.config.app_update_force_update

        if not latest_version:
            return AndroidUpdateRelease(
                ready=False,
                latest_version=None,
                latest_build=latest_build,
                min_supported_build=min_supported_build,
                force_update=force_update,
                published_at=self.config.app_update_published_at,
                release_notes=release_notes,
                download_url=None,
                download_mode=None,
                download_name=None,
                reason="APP_UPDATE_LATEST_VERSION 未配置",
            )

        if latest_build <= 0:
            return AndroidUpdateRelease(
                ready=False,
                latest_version=latest_version,
                latest_build=latest_build,
                min_supported_build=min_supported_build,
                force_update=force_update,
                published_at=self.config.app_update_published_at,
                release_notes=release_notes,
                download_url=None,
                download_mode=None,
                download_name=None,
                reason="APP_UPDATE_LATEST_BUILD 未配置或无效",
            )

        target = self.get_android_download_target()
        download_name = target.download_name
        if target.local_path is not None:
            download_url = url_for("update.download_android_apk", _external=external)
            return AndroidUpdateRelease(
                ready=True,
                latest_version=latest_version,
                latest_build=latest_build,
                min_supported_build=min_supported_build,
                force_update=force_update,
                published_at=self.config.app_update_published_at,
                release_notes=release_notes,
                download_url=download_url,
                download_mode="hosted",
                download_name=download_name,
                reason=None,
            )

        if target.redirect_url:
            return AndroidUpdateRelease(
                ready=True,
                latest_version=latest_version,
                latest_build=latest_build,
                min_supported_build=min_supported_build,
                force_update=force_update,
                published_at=self.config.app_update_published_at,
                release_notes=release_notes,
                download_url=target.redirect_url,
                download_mode="redirect",
                download_name=download_name,
                reason=None,
            )

        return AndroidUpdateRelease(
            ready=False,
            latest_version=latest_version,
            latest_build=latest_build,
            min_supported_build=min_supported_build,
            force_update=force_update,
            published_at=self.config.app_update_published_at,
            release_notes=release_notes,
            download_url=None,
            download_mode=None,
            download_name=download_name,
            reason="未配置可用的安卓安装包下载地址或本地 APK 文件不存在",
        )

    def get_android_download_target(self) -> AndroidDownloadTarget:
        local_path = self.config.app_update_android_apk_path
        download_name = (self.config.app_update_android_download_name or "").strip() or None

        if local_path:
            local_path = local_path.resolve()
            if local_path.is_file():
                return AndroidDownloadTarget(
                    local_path=local_path,
                    redirect_url=None,
                    download_name=download_name or local_path.name,
                )

        redirect_url = (self.config.app_update_android_apk_url or "").strip() or None
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
