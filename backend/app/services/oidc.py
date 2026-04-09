"""
OpenID Connect helper — handles discovery, authorization URL construction,
code-for-token exchange, and ID-token parsing with group claim extraction.
"""

import httpx
from jose import jwt as jose_jwt
from typing import Optional
from app.config import get_settings

# Module-level cache for the discovery document
_discovery_cache: Optional[dict] = None


async def _get_discovery() -> dict:
    """Fetch and cache the OIDC discovery document."""
    global _discovery_cache
    if _discovery_cache is not None:
        return _discovery_cache

    settings = get_settings()
    url = settings.oidc_discovery_url.rstrip("/")
    # Accept both the base issuer URL and the full .well-known path
    if not url.endswith(".well-known/openid-configuration"):
        url = url.rstrip("/") + "/.well-known/openid-configuration"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _discovery_cache = resp.json()
        return _discovery_cache


def clear_discovery_cache():
    global _discovery_cache
    _discovery_cache = None


async def get_authorization_url(state: str) -> str:
    """Build the authorization redirect URL."""
    settings = get_settings()
    disco = await _get_discovery()

    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
    }
    qs = "&".join(f"{k}={httpx.QueryParams({k: v})}" for k, v in params.items())
    # Build properly
    from urllib.parse import urlencode
    return disco["authorization_endpoint"] + "?" + urlencode(params)


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for tokens. Returns the full token response."""
    settings = get_settings()
    disco = await _get_discovery()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            disco["token_endpoint"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.oidc_redirect_uri,
                "client_id": settings.oidc_client_id,
                "client_secret": settings.oidc_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_jwks() -> dict:
    """Fetch the JWKS from the provider."""
    disco = await _get_discovery()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(disco["jwks_uri"])
        resp.raise_for_status()
        return resp.json()


async def parse_id_token(id_token: str) -> dict:
    """
    Decode and verify the ID token.
    Returns the full claims dict.
    """
    settings = get_settings()
    disco = await _get_discovery()
    jwks = await get_jwks()

    # python-jose can accept a JWKS dict directly
    claims = jose_jwt.decode(
        id_token,
        jwks,
        algorithms=["RS256", "RS384", "RS512", "ES256", "ES384"],
        audience=settings.oidc_client_id,
        issuer=disco.get("issuer"),
        options={"verify_at_hash": False},
    )
    return claims


def extract_user_info(claims: dict) -> dict:
    """
    Pull username, email, and groups from ID-token claims.
    Returns: { username, email, groups: list[str] }
    """
    settings = get_settings()

    # Username: prefer 'preferred_username', fall back to 'sub'
    username = (
        claims.get("preferred_username")
        or claims.get("email", "").split("@")[0]
        or claims.get("sub", "")
    )
    email = claims.get("email")
    sub = claims.get("sub", "")

    # Groups from the configured claim name
    groups_claim = settings.oidc_groups_claim
    groups = claims.get(groups_claim, [])
    if isinstance(groups, str):
        groups = [g.strip() for g in groups.split(",") if g.strip()]

    return {
        "username": username,
        "email": email,
        "oidc_sub": sub,
        "groups": groups,
    }


def resolve_role(groups: list[str]) -> dict:
    """
    Given a user's OIDC groups, determine:
      - allowed: bool  (is the user permitted to log in?)
      - is_admin: bool
    """
    settings = get_settings()
    admin_group = settings.oidc_admin_group.strip()
    user_group = settings.oidc_user_group.strip()

    is_admin = bool(admin_group and admin_group in groups)

    # If a user group is configured, the user must be in either the user
    # group or the admin group to be allowed in.
    if user_group:
        allowed = (user_group in groups) or is_admin
    else:
        # No user group restriction — anyone who authenticates is allowed.
        allowed = True

    return {"allowed": allowed, "is_admin": is_admin}
