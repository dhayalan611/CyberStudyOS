from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


GEMINI_MODEL = "gemini-3.5-flash-lite"


class Settings(BaseSettings):
    DATABASE_URL: str
    AUTH_SECRET: SecretStr
    AUTH_COOKIE_SECURE: bool = True
    AUTH_TOKEN_MINUTES: int = Field(default=30, ge=1, le=1440)
    AUTH_LOGIN_RATE_LIMIT: int = Field(default=10, ge=1, le=10000)
    AUTH_REGISTER_RATE_LIMIT: int = Field(default=5, ge=1, le=10000)
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60, ge=1, le=86400)
    GEMINI_API_KEY: SecretStr | None = None
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def use_psycopg3_driver(cls, value: object) -> object:
        """Make provider-generic PostgreSQL URLs use the installed Psycopg 3 driver."""
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    @field_validator("AUTH_SECRET")
    @classmethod
    def validate_auth_secret(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if len(secret.encode("utf-8")) < 32 or secret.startswith("REPLACE_"):
            raise ValueError("AUTH_SECRET must be a generated secret of at least 32 bytes")
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_origins(cls, value: list[str]) -> list[str]:
        if any(origin in {"*", "null"} for origin in value):
            raise ValueError("Explicit trusted origins are required")
        return value

    model_config = SettingsConfigDict(
        hide_input_in_errors=True,
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
