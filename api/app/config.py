import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import EmailStr

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    secret_key: str
    frontend_url: str = "http://localhost:5173"
    allowed_emails: str = ""
    
    # Auth config
    magic_link_expire_minutes: int = 15
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @property
    def frontend_url_list(self) -> list[str]:
        """FRONTEND_URL may hold several comma-separated origins (e.g. localhost + ngrok)."""
        return [u.strip().rstrip("/") for u in self.frontend_url.split(",") if u.strip()]

    @property
    def allowed_email_list(self) -> list[str]:
        return [email.strip() for email in self.allowed_emails.split(",") if email.strip()]

settings = Settings()
