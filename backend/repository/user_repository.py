from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from backend.models.auth import Session, User, UserCredential
from backend.db import db_session


class NotFoundError(Exception):
    pass


class UserRepository:
    def get_credential(self, phone: str) -> UserCredential:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, phone, password_hash, password_algo, password_cost
                FROM users
                WHERE phone = %s
                """,
                (phone,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("credential not found")
        return UserCredential(
            user_id=row["id"],
            phone=row["phone"],
            password_hash=row["password_hash"],
            password_algo=row["password_algo"],
            password_cost=row["password_cost"],
        )

    def get_by_id(self, user_id: UUID) -> User:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, phone, display_name, password_hash, password_algo, password_cost,
                       roles, avatar_data, created_at, updated_at, last_login_at
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("user not found")
        return self._row_to_user(row)

    def create_with_password(
        self,
        phone: str,
        password_hash: str,
        password_algo: str,
        password_cost: int,
        display_name: str | None = None,
    ) -> User:
        uid = uuid4()
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (
                    id, phone, display_name, password_hash, password_algo, password_cost
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, phone, display_name, password_hash, password_algo, password_cost,
                          roles, avatar_data, created_at, updated_at, last_login_at
                """,
                (
                    uid,
                    phone,
                    display_name or phone,
                    password_hash,
                    password_algo,
                    password_cost,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return self._row_to_user(row)

    def create_session(self, session: Session) -> None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (
                    id, user_id, refresh_token_sha, expires_at, user_agent, ip, revoked_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    session.id,
                    session.user_id,
                    session.refresh_token_sha,
                    session.expires_at,
                    session.user_agent,
                    session.ip,
                    session.revoked_at,
                    session.created_at,
                ),
            )
            conn.commit()

    def get_session_by_hash(self, refresh_token_sha: str) -> Session:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, refresh_token_sha, expires_at, user_agent, ip, revoked_at, created_at
                FROM sessions
                WHERE refresh_token_sha = %s
                """,
                (refresh_token_sha,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("session not found")
        return self._row_to_session(row)

    def revoke_session(self, session_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sessions
                SET revoked_at = %s
                WHERE id = %s AND revoked_at IS NULL
                """,
                (now, session_id),
            )
            conn.commit()

    def record_login(self, user_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_login_at = %s, updated_at = %s WHERE id = %s",
                (now, now, user_id),
            )
            conn.commit()

    def update_credentials(
        self,
        user_id: UUID,
        password_hash: str,
        password_algo: str,
        password_cost: int,
        display_name: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET password_hash = %s,
                    password_algo = %s,
                    password_cost = %s,
                    display_name = COALESCE(%s, display_name),
                    updated_at = %s
                WHERE id = %s
                """,
                (password_hash, password_algo, password_cost, display_name, now, user_id),
            )
            conn.commit()

    def update_roles(self, user_id: UUID, roles: list[str]) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET roles = %s,
                    updated_at = %s
                WHERE id = %s
                """,
                (roles, now, user_id),
            )
            conn.commit()

    def update_profile(self, user_id: UUID, display_name: str, avatar_data: str | None = None) -> User:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET display_name = %s,
                    avatar_data = COALESCE(%s, avatar_data),
                    updated_at = %s
                WHERE id = %s
                RETURNING id, phone, display_name, password_hash, password_algo, password_cost,
                          roles, avatar_data, created_at, updated_at, last_login_at
                """,
                (display_name, avatar_data, now, user_id),
            )
            row = cur.fetchone()
            conn.commit()
        if not row:
            raise NotFoundError("user not found")
        return self._row_to_user(row)

    def _row_to_user(self, row: dict) -> User:
        return User(
            id=row["id"],
            phone=row["phone"],
            display_name=row["display_name"],
            password_hash=row["password_hash"],
            password_algo=row["password_algo"],
            password_cost=row["password_cost"],
            roles=row.get("roles") or [],
            avatar_data=row.get("avatar_data"),
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
            last_login_at=row.get("last_login_at"),
        )

    def _row_to_session(self, row: dict) -> Session:
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            refresh_token_sha=row["refresh_token_sha"],
            expires_at=row["expires_at"],
            user_agent=row.get("user_agent"),
            ip=row.get("ip"),
            revoked_at=row.get("revoked_at"),
            created_at=row["created_at"],
        )


__all__ = ["UserRepository", "NotFoundError"]
