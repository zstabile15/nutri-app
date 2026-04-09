from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import UserCreate, UserLogin, UserOut, Token, UserGoalsUpdate, OIDCLoginURL
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db
import aiosqlite

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(data: UserCreate, db: aiosqlite.Connection = Depends(get_db)):
    # Check existing
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
    return Token(
        access_token=token,
        user=UserOut(
            id=user["id"],
            username=user["username"],
            email=user.get("email"),
            calorie_goal=user.get("calorie_goal", 2000),
            protein_goal=user.get("protein_goal", 150),
            carb_goal=user.get("carb_goal", 250),
            fat_goal=user.get("fat_goal", 65),
        ),
    )


@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    return UserOut(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        calorie_goal=user.get("calorie_goal", 2000),
        protein_goal=user.get("protein_goal", 150),
        carb_goal=user.get("carb_goal", 250),
        fat_goal=user.get("fat_goal", 65),
    )


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
    return UserOut(
        id=updated["id"],
        username=updated["username"],
        email=updated.get("email"),
        calorie_goal=updated.get("calorie_goal", 2000),
        protein_goal=updated.get("protein_goal", 150),
        carb_goal=updated.get("carb_goal", 250),
        fat_goal=updated.get("fat_goal", 65),
    )


@router.get("/oidc/enabled")
async def oidc_status():
    from app.config import get_settings
    s = get_settings()
    return {"enabled": s.oidc_enabled}
