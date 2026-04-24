"""认证路由：注册、登录、刷新和个人资料。"""

from __future__ import annotations

import logging
from typing import Any, Callable
from uuid import UUID

from flask import Blueprint, jsonify, request

from backend.config import Config
from backend.repository.user_repository import NotFoundError, UserRepository
from backend.services.auth_service import AuthMetadata, AuthService
from backend.services.exceptions import InvalidCredentialsError, UnauthorizedError, ValidationError

bp = Blueprint("auth", __name__)

config = Config()
logger = logging.getLogger(__name__)
user_repo = UserRepository()
auth_service = AuthService(config, user_repo, logger=logger)


def _user_payload(user, include_avatar: bool = False) -> dict[str, Any]:
    payload = {
      "id": str(user.id),
      "phone": user.phone,
      "display_name": user.display_name,
      "roles": user.roles,
    }
    if include_avatar:
        payload["avatar_url"] = user.avatar_data
    return payload


def _get_auth_metadata() -> AuthMetadata:
    return AuthMetadata(
        user_agent=request.headers.get("User-Agent"),
        ip=request.headers.get("X-Real-IP") or request.remote_addr,
    )


def _bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1]
    return None


def login_required(func: Callable[..., Any]):
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        try:
            claims = auth_service.parse_access_token(token or "")
        except UnauthorizedError:
            return jsonify({"error": "未授权访问"}), 401
        request.auth_claims = claims  # type: ignore[attr-defined]
        return func(*args, **kwargs)

    wrapper.__name__ = func.__name__
    return wrapper


def admin_required(func: Callable[..., Any]):
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        try:
            claims = auth_service.parse_access_token(token or "")
        except UnauthorizedError:
            return jsonify({"error": "未授权访问"}), 401
        roles = claims.get("roles") or []
        if "admin" not in roles:
            return jsonify({"error": "需要管理员权限"}), 403
        request.auth_claims = claims  # type: ignore[attr-defined]
        return func(*args, **kwargs)

    wrapper.__name__ = func.__name__
    return wrapper


@bp.route("/token", methods=["POST"])
def login():
    data = request.get_json(force=True, silent=True) or {}
    phone = str(data.get("phone") or data.get("account") or data.get("username") or "").strip()
    password = str(data.get("password") or "")

    try:
        result = auth_service.login(phone, password, _get_auth_metadata())
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except InvalidCredentialsError:
        return jsonify({"error": "手机号或密码错误"}), 401
    except Exception as exc:  # pragma: no cover
        logger.exception("login failed")
        return jsonify({"error": f"登录失败: {exc}"}), 500

    return jsonify(
        {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "expires_in": int(config.auth_access_token_ttl.total_seconds()),
            "user": _user_payload(result.user),
        }
    ), 200


@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(force=True, silent=True) or {}
    phone = str(data.get("phone") or "").strip()
    password = str(data.get("password") or "")
    display_name = data.get("display_name") or None

    try:
        user = auth_service.register(phone, password, display_name)
        result = auth_service.login(phone, password, _get_auth_metadata())
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        logger.exception("register failed")
        return jsonify({"error": f"注册失败: {exc}"}), 500

    return jsonify(
        {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "expires_in": int(config.auth_access_token_ttl.total_seconds()),
            "user": _user_payload(user),
        }
    ), 201


@bp.route("/token/refresh", methods=["POST"])
def refresh():
    data = request.get_json(force=True, silent=True) or {}
    token = str(data.get("refresh_token") or "")
    try:
        result = auth_service.refresh(token, _get_auth_metadata())
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except UnauthorizedError:
        return jsonify({"error": "刷新令牌无效或已过期"}), 401
    except Exception as exc:  # pragma: no cover
        logger.exception("refresh failed")
        return jsonify({"error": f"刷新失败: {exc}"}), 500

    return jsonify(
        {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "expires_in": int(config.auth_access_token_ttl.total_seconds()),
            "user": _user_payload(result.user),
        }
    ), 200


@bp.route("/logout", methods=["POST"])
def logout():
    data = request.get_json(force=True, silent=True) or {}
    token = str(data.get("refresh_token") or "")
    try:
        auth_service.logout(token)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        logger.exception("logout failed")
        return jsonify({"error": f"登出失败: {exc}"}), 500
    return jsonify({"message": "已登出"}), 200


@bp.route("/me", methods=["GET"])
@login_required
def get_me():
    claims = getattr(request, "auth_claims", {})
    user_id = claims.get("sub")
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    try:
        user = user_repo.get_by_id(UUID(str(user_id)))
    except (ValueError, NotFoundError):
        return jsonify({"error": "用户不存在"}), 404

    return (
        jsonify(
            {
                "user_id": str(user.id),
                "display_name": user.display_name,
                "phone": user.phone,
                "roles": user.roles,
                "avatar_url": user.avatar_data,
            }
        ),
        200,
    )


@bp.route("/me", methods=["PUT"])
@login_required
def update_me():
    claims = getattr(request, "auth_claims", {})
    user_id = claims.get("sub")
    if not user_id:
        return jsonify({"error": "未授权访问"}), 401

    data = request.get_json(force=True, silent=True) or {}
    display_name = data.get("display_name")
    avatar_image = data.get("avatar_image")

    try:
        user = auth_service.update_profile(UUID(str(user_id)), display_name, avatar_image)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except (ValueError, NotFoundError):
        return jsonify({"error": "用户不存在"}), 404
    except Exception as exc:  # pragma: no cover
        logger.exception("update me failed")
        return jsonify({"error": f"更新失败: {exc}"}), 500

    return jsonify({"user": _user_payload(user, include_avatar=True)}), 200
