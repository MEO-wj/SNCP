from __future__ import annotations

import logging

from flask import Blueprint, jsonify, redirect, request, send_file

from backend.config import Config
from backend.services.app_update_service import AppUpdateService

bp = Blueprint("update", __name__)

config = Config()
logger = logging.getLogger(__name__)
update_service = AppUpdateService(config)


def _parse_build(raw_value: str | None) -> int | None:
    if raw_value is None or str(raw_value).strip() == "":
        return None
    value = int(str(raw_value).strip())
    if value < 0:
        raise ValueError("build must be non-negative")
    return value


@bp.route("/check", methods=["GET"])
def check_update():
    platform = str(request.args.get("platform") or "android").strip().lower()
    if platform != "android":
        return jsonify({"error": "当前仅支持 Android 安装包更新检测"}), 400

    try:
        current_build = _parse_build(request.args.get("build"))
    except ValueError:
        return jsonify({"error": "build 参数无效"}), 400

    current_version = str(request.args.get("version") or "").strip() or None
    payload = update_service.build_android_check_payload(
        current_build=current_build,
        current_version=current_version,
        external_download_url=True,
    )

    response = jsonify(payload)
    response.headers["Cache-Control"] = "no-store"
    return response, 200


@bp.route("/android/apk", methods=["GET"])
def download_android_apk():
    target = update_service.get_android_download_target()
    if target.local_path is not None:
        return send_file(
            target.local_path,
            mimetype="application/vnd.android.package-archive",
            as_attachment=True,
            download_name=target.download_name or target.local_path.name,
            conditional=True,
            max_age=300,
        )

    if target.redirect_url:
        return redirect(target.redirect_url, code=302)

    logger.warning("android apk download requested but no valid target configured")
    return jsonify({"error": "安卓安装包暂未配置"}), 404
