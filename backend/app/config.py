from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_path: str = "/app/data/nutri.db"
    jwt_secret: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    usda_api_key: str = "DEMO_KEY"

    oidc_enabled: bool = False
    oidc_discovery_url: str = ""
    oidc_client_id: str = ""
    oidc_client_secret: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
