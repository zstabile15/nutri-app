from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import (
    UserCreate, UserLogin, UserOut, Token, UserGoalsUpdate,
    SetupStatus, AdminSetup, AdminUserList,
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db
import aiosqlite

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: dict) -> UserOut:
    """Build a UserOut from a DB row dict."""
    return UserOut(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        is_admin=bool(user.get("is_admin", 0)),
        calorie_goal=user.get("calorie_goal", 2000),
        protein_goal=user.get("protein_goal", 150),
        carb_goal=user.get("carb_goal", 250),
        fat_goal=user.get("fat_goal", 65),
    )


# ── Public: setup status ───────────────────────────────────────────────
@router.get("/setup-status", response_model=SetupStatus)
async def setup_status(db: aiosqlite.Connection = Depends(get_db)):
    """Check whether initial admin setup has been completed."""
    cursor = await db.execute("SELECT id FROM users WHERE is_admin = 1 LIMIT 1")
    admin = await cursor.fetchone()
    return SetupStatus(needs_setup=admin is None, admin_exists=admin is not None)


# ── Public: first-time admin setup ─────────────────────────────────────
@router.post("/setup", response_model=Token)
async def initial_setup(data: AdminSetup, db: aiosqlite.Connection = Depends(get_db)):
    """Create the initial admin account. Only works when no admin exists."""
    cursor = await db.execute("SELECT id FROM users WHERE is_admin = 1 LIMIT 1")
    if await cursor.fetchone():
        raise HTTPException(status_code=403, detail="Setup already completed")

    pw_hash = hash_password(data.password)
    cursor = await db.execute(
        "INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 1)",
        (data.username, data.email, pw_hash),
    )
    await db.commit()
    user_id = cursor.lastrowid

    token = create_access_token(user_id, data.username)
    return Token(
        access_token=token,
        user=UserOut(
            id=user_id, username=data.username, email=data.email, is_admin=True,
        ),
    )


# ── Public: login ──────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM users WHERE username = ?", (data.username,))
    user = await cursor.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = dict(user)
    if not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user["id"], user["username"])
    return Token(access_token=token, user=_user_out(user))


# ── Admin only: register a new user ───────────────────────────────────
@router.post("/register", response_model=Token)
async def register(
    data: UserCreate,
    admin: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Create a new user. Requires admin privileges."""
    if not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can register new users")

    cursor = await db.execute(
        "SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)",
        (data.username, data.email),
    )
    if await cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username or email already taken")

    pw_hash = hash_password(data.password)
    cursor = await db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (data.username, data.email, pw_hash),
    )
    await db.commit()
    user_id = cursor.lastrowid

    token = create_access_token(user_id, data.username)
    return Token(
        access_token=token,
        user=UserOut(id=user_id, username=data.username, email=data.email),
    )


# ── Authenticated: get own profile ────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    return _user_out(user)


# ── Authenticated: update own goals ───────────────────────────────────
@router.put("/goals", response_model=UserOut)
async def update_goals(
    data: UserGoalsUpdate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    fields = []
    values = []
    if data.calorie_goal is not None:
        fields.append("calorie_goal = ?")
        values.append(data.calorie_goal)
    if data.protein_goal is not None:
        fields.append("protein_goal = ?")
        values.append(data.protein_goal)
    if data.carb_goal is not None:
        fields.append("carb_goal = ?")
        values.append(data.carb_goal)
    if data.fat_goal is not None:
        fields.append("fat_goal = ?")
        values.append(data.fat_goal)

    if fields:
        values.append(user["id"])
        await db.execute(
            f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values
        )
        await db.commit()

    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
    updated = dict(await cursor.fetchone())
    return _user_out(updated)


# ── Admin only: list all users ─────────────────────────────────────────
@router.get("/users", response_model=list[AdminUserList])
async def list_users(
    admin: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    if not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    cursor = await db.execute(
        "SELECT id, username, email, is_admin, created_at FROM users ORDER BY id"
    )
    return [dict(r) for r in await cursor.fetchall()]


# ── Admin only: delete a user ──────────────────────────────────────────
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    if not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    cursor = await db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Delete user's data, then user
    for table in ("meal_logs", "weight_logs", "workouts", "food_items"):
        await db.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
    await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    await db.commit()
    return {"ok": True}


# ── OIDC: status + login + callback ────────────────────────────────────
@router.get("/oidc/enabled")
async def oidc_status():
    from app.config import get_settings
    s = get_settings()
    return {"enabled": s.oidc_enabled}


@router.get("/oidc/login")
async def oidc_login():
    """Return the OIDC authorization URL for the frontend to redirect to."""
    from app.config import get_settings
    s = get_settings()
    if not s.oidc_enabled:
        raise HTTPException(status_code=400, detail="OIDC is not enabled")

    import secrets
    state = secrets.token_urlsafe(32)
    # In a production app you'd store this state server-side to validate on
    # callback.  For simplicity we pass it through and skip CSRF validation,
    # since the callback still validates the code exchange with the IdP.

    from app.services.oidc import get_authorization_url
    url = await get_authorization_url(state)
    return {"url": url, "state": state}


@router.get("/oidc/callback", response_model=Token)
async def oidc_callback(
    code: str,
    state: str = "",
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Exchange the authorization code for tokens, extract the user's identity
    and groups, then upsert the local user record and return a JWT.
    """
    from app.config import get_settings
    s = get_settings()
    if not s.oidc_enabled:
        raise HTTPException(status_code=400, detail="OIDC is not enabled")

    from app.services.oidc import exchange_code, parse_id_token, extract_user_info, resolve_role

    try:
        token_resp = await exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Code exchange failed: {e}")

    id_token = token_resp.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No id_token in response")

    try:
        claims = await parse_id_token(id_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token validation failed: {e}")

    info = extract_user_info(claims)
    role = resolve_role(info["groups"])

    if not role["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="You are not in an authorized group. Contact your admin.",
        )

    # Upsert: find by oidc_sub, or create
    cursor = await db.execute(
        "SELECT * FROM users WHERE oidc_sub = ?", (info["oidc_sub"],)
    )
    existing = await cursor.fetchone()

    if existing:
        user = dict(existing)
        # Update admin status and email on every login so group changes take effect
        await db.execute(
            "UPDATE users SET is_admin = ?, email = ?, username = ? WHERE id = ?",
            (int(role["is_admin"]), info["email"], info["username"], user["id"]),
        )
        await db.commit()
        user["is_admin"] = int(role["is_admin"])
        user["email"] = info["email"]
        user["username"] = info["username"]
    else:
        cursor = await db.execute(
            """INSERT INTO users (username, email, oidc_sub, is_admin)
               VALUES (?, ?, ?, ?)""",
            (info["username"], info["email"], info["oidc_sub"], int(role["is_admin"])),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,))
        user = dict(await cursor.fetchone())

    jwt_token = create_access_token(user["id"], user["username"])
    return Token(access_token=jwt_token, user=_user_out(user))
