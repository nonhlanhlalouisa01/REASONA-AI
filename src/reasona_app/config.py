from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    foundry_project_endpoint: str = ""
    foundry_agent_name: str = "reasona-ai"
    foundry_agent_version: str = "2"
    foundry_timeout_seconds: float = Field(default=120.0, ge=10.0, le=300.0)
    max_transcript_characters: int = Field(default=60_000, ge=5_000, le=200_000)
    max_image_bytes: int = Field(default=4_000_000, ge=100_000, le=10_000_000)

    @field_validator("foundry_project_endpoint")
    @classmethod
    def normalize_project_endpoint(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        if normalized and not normalized.startswith("https://"):
            raise ValueError("FOUNDRY_PROJECT_ENDPOINT must use HTTPS")
        return normalized

    @field_validator("foundry_agent_name", "foundry_agent_version")
    @classmethod
    def require_non_empty_agent_value(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Foundry agent name and version cannot be empty")
        return normalized

    @property
    def foundry_configured(self) -> bool:
        return bool(self.foundry_project_endpoint)


@lru_cache
def get_settings() -> Settings:
    return Settings()
