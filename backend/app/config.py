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
    oidc_redirect_uri: str = ""  # e.g. http://localhost:3000/oidc/callback
    oidc_scopes: str = "openid email profile groups"
    oidc_groups_claim: str = "groups"  # claim name in ID token that holds group list
    oidc_admin_group: str = ""  # users in this group get is_admin=True
    oidc_user_group: str = ""   # if set, users must be in this group to log in

    admin_username: str = ""
    admin_password: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
