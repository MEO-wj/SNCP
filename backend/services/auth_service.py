from __future__ import annotations

import base64
import binascii
import io
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any
from uuid import UUID, uuid4

import bcrypt
import jwt
from PIL import Image, UnidentifiedImageError

from backend.config import Config
from backend.models.auth import Session, User
from backend.repository.user_repository import NotFoundError, UserRepository
from backend.services.exceptions import InvalidCredentialsError, UnauthorizedError, ValidationError


@dataclass
class AuthMetadata:
    user_agent: str | None = None
    ip: str | None = None


@dataclass
class AuthResult:
    access_token: str
    refresh_token: str
    user: User


class AuthService:
    AVATAR_MAX_INPUT_BYTES = 4 * 1024 * 1024
    AVATAR_SIZE = 256
    ADMIN_LOGIN_NAME = "admin"
    ADMIN_PHONE = "00000000000"
    ADMIN_DISPLAY_NAME = "管理员"
    ADMIN_PASSWORD = "795348503"

    def __init__(
        self,
        cfg: Config,
        repo: UserRepository,
        logger: logging.Logger | None = None,
    ) -> None:
        self.cfg = cfg
        self.repo = repo
        self.log = logger or logging.getLogger(__name__)
        self.admin_login_name = (self.cfg.admin_login_name or self.ADMIN_LOGIN_NAME).strip().lower()
        self.admin_phone = self._normalize_phone(self.cfg.admin_phone or self.ADMIN_PHONE)
        self.admin_display_name = (self.cfg.admin_display_name or self.ADMIN_DISPLAY_NAME).strip() or self.ADMIN_DISPLAY_NAME
        self.admin_password = self.cfg.admin_password or self.ADMIN_PASSWORD

        if not self.cfg.auth_jwt_secret:
            raise RuntimeError("AUTH_JWT_SECRET 未配置")
        if not self.cfg.auth_refresh_hash_key:
            raise RuntimeError("AUTH_REFRESH_HASH_KEY 未配置")

    def register(self, phone: str, password: str, display_name: str | None = None) -> User:
        normalized_phone = self._normalize_phone(phone)
        if not normalized_phone or not password:
            raise ValidationError("请输入手机号和密码")
        if not self._is_valid_phone(normalized_phone):
            raise ValidationError("手机号格式不正确")

        try:
            self.repo.get_credential(normalized_phone)
        except NotFoundError:
            pass
        else:
            raise ValidationError("手机号已注册")

        hashed = self._hash_password(password)
        user = self.repo.create_with_password(
            phone=normalized_phone,
            password_hash=hashed,
            password_algo="bcrypt",
            password_cost=self._password_cost(),
            display_name=display_name or normalized_phone,
        )
        if self._is_admin_phone(normalized_phone):
            self.repo.update_roles(user.id, ["admin"])
            user = self.repo.get_by_id(user.id)
        return user

    def login(self, phone: str, password: str, meta: AuthMetadata) -> AuthResult:
        raw_identifier = str(phone or "").strip()
        raw_password = str(password or "")
        if not raw_identifier or not raw_password:
            raise ValidationError("请输入手机号和密码")

        if raw_identifier.lower() == self.admin_login_name:
            user = self._login_admin(raw_password)
            self._try_record_login(user.id, "record admin login failed")
            return self._issue_tokens(user, meta)

        normalized_phone = self._normalize_phone(raw_identifier)
        if not self._is_valid_phone(normalized_phone):
            raise ValidationError("手机号格式不正确")

        try:
            cred = self.repo.get_credential(normalized_phone)
        except NotFoundError as exc:
            raise InvalidCredentialsError("invalid credentials") from exc

        if not bcrypt.checkpw(raw_password.encode("utf-8"), cred.password_hash.encode("utf-8")):
            raise InvalidCredentialsError("invalid credentials")

        self._try_record_login(cred.user_id, "record login failed")

        user = self.repo.get_by_id(cred.user_id)
        if self._is_admin_phone(normalized_phone) and "admin" not in user.roles:
            self.repo.update_roles(user.id, list({*user.roles, "admin"}))
            user = self.repo.get_by_id(cred.user_id)
        return self._issue_tokens(user, meta)

    def refresh(self, refresh_token: str, meta: AuthMetadata) -> AuthResult:
        token = (refresh_token or "").strip()
        if not token:
            raise ValidationError("refresh token missing")

        hashed = self._hash_refresh_token(token)
        try:
            session = self.repo.get_session_by_hash(hashed)
        except NotFoundError as exc:
            raise UnauthorizedError("session not found") from exc

        if session.revoked_at is not None:
            raise UnauthorizedError("session revoked")
        if datetime.now(timezone.utc) > session.expires_at:
            raise UnauthorizedError("session expired")

        try:
            user = self.repo.get_by_id(session.user_id)
        except NotFoundError as exc:
            raise UnauthorizedError("user missing") from exc

        self.repo.revoke_session(session.id)
        return self._issue_tokens(user, meta)

    def update_profile(self, user_id: UUID, display_name: str | None = None, avatar_image: str | None = None) -> User:
        normalized_name = (display_name or "").strip()
        if not normalized_name:
            raise ValidationError("昵称不能为空")
        if len(normalized_name) > 30:
            raise ValidationError("昵称长度不能超过 30 个字符")

        avatar_data = self._process_avatar_image(avatar_image) if avatar_image else None
        return self.repo.update_profile(user_id, normalized_name, avatar_data)

    def logout(self, refresh_token: str) -> None:
        token = (refresh_token or "").strip()
        if not token:
            raise ValidationError("refresh token missing")

        hashed = self._hash_refresh_token(token)
        try:
            session = self.repo.get_session_by_hash(hashed)
        except NotFoundError:
            return
        self.repo.revoke_session(session.id)

    def parse_access_token(self, token: str) -> dict[str, Any]:
        if not token:
            raise UnauthorizedError("token missing")
        try:
            payload = jwt.decode(
                token,
                self.cfg.auth_jwt_secret,
                algorithms=["HS256"],
                options={"require": ["exp", "iat", "sub"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise UnauthorizedError("token expired") from exc
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("token invalid") from exc
        return payload

    def _login_admin(self, password: str) -> User:
        if password != self.admin_password:
            raise InvalidCredentialsError("invalid credentials")

        try:
            user = self.repo.get_by_phone(self.admin_phone)
        except NotFoundError:
            user = self.repo.create_with_password(
                phone=self.admin_phone,
                password_hash=self._hash_password(self.admin_password),
                password_algo="bcrypt",
                password_cost=self._password_cost(),
                display_name=self.admin_display_name,
            )

        if "admin" not in user.roles:
            self.repo.update_roles(user.id, list({*user.roles, "admin"}))
            user = self.repo.get_by_id(user.id)
        return user

    def _try_record_login(self, user_id: UUID, message: str) -> None:
        try:
            self.repo.record_login(user_id)
        except Exception as exc:  # pragma: no cover
            self.log.warning(message, extra={"user_id": str(user_id), "error": str(exc)})

    def _issue_tokens(self, user: User, meta: AuthMetadata) -> AuthResult:
        access_token = self._sign_access_token(user)
        refresh_token, session = self._generate_refresh_token(user, meta)
        self.repo.create_session(session)
        return AuthResult(access_token=access_token, refresh_token=refresh_token, user=user)

    def _sign_access_token(self, user: User) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "name": user.display_name,
            "roles": user.roles,
            "phone": user.phone,
            "iat": int(now.timestamp()),
            "exp": int((now + self._access_ttl()).timestamp()),
        }
        return jwt.encode(payload, self.cfg.auth_jwt_secret, algorithm="HS256")

    def _generate_refresh_token(self, user: User, meta: AuthMetadata) -> tuple[str, Session]:
        raw_bytes = os.urandom(48)
        raw_token = base64.urlsafe_b64encode(raw_bytes).decode("ascii").rstrip("=")

        now = datetime.now(timezone.utc)
        session = Session(
            id=uuid4(),
            user_id=user.id,
            refresh_token_sha=self._hash_refresh_token(raw_token),
            expires_at=now + self._refresh_ttl(),
            user_agent=meta.user_agent,
            ip=meta.ip,
            revoked_at=None,
            created_at=now,
        )
        return raw_token, session

    def _hash_refresh_token(self, token: str) -> str:
        key = self.cfg.auth_refresh_hash_key or ""
        digest = sha256(f"{key}{token}".encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

    def _hash_password(self, password: str) -> str:
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=self._password_cost()))
        return hashed.decode("utf-8")

    def _process_avatar_image(self, image_payload: str) -> str:
        payload = (image_payload or "").strip()
        if not payload:
            raise ValidationError("头像图片不能为空")

        if "," in payload and payload.split(",", 1)[0].lower().startswith("data:image/"):
            payload = payload.split(",", 1)[1]

        try:
            raw = base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValidationError("头像图片格式不正确") from exc

        if len(raw) > self.AVATAR_MAX_INPUT_BYTES:
            raise ValidationError("头像图片不能超过 4MB")

        try:
            with Image.open(io.BytesIO(raw)) as img:
                img = img.convert("RGB")
                width, height = img.size
                side = min(width, height)
                left = (width - side) // 2
                top = (height - side) // 2
                img = img.crop((left, top, left + side, top + side))
                img = img.resize((self.AVATAR_SIZE, self.AVATAR_SIZE), Image.Resampling.LANCZOS)

                output = io.BytesIO()
                img.save(output, format="JPEG", quality=82, optimize=True)
        except (UnidentifiedImageError, OSError) as exc:
            raise ValidationError("头像图片无法识别") from exc

        encoded = base64.b64encode(output.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{encoded}"

    def _password_cost(self) -> int:
        if 4 <= self.cfg.auth_password_cost <= 31:
            return self.cfg.auth_password_cost
        return 12

    def _normalize_phone(self, phone: str) -> str:
        return "".join(ch for ch in (phone or "").strip() if ch.isdigit())

    def _is_valid_phone(self, phone: str) -> bool:
        return len(phone) == 11 and phone.isdigit()

    def _is_admin_phone(self, phone: str) -> bool:
        return phone in self.cfg.admin_phones

    def _access_ttl(self) -> timedelta:
        return self.cfg.auth_access_token_ttl or timedelta(hours=1)

    def _refresh_ttl(self) -> timedelta:
        return self.cfg.auth_refresh_token_ttl or timedelta(days=7)
