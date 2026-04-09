from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas import WeightLogCreate, WeightLogOut
from app.auth import get_current_user
from app.database import get_db
from datetime import date, timedelta
import aiosqlite

router = APIRouter(prefix="/api/weight", tags=["weight"])


@router.post("/", response_model=WeightLogOut)
async def log_weight(
    data: WeightLogCreate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    logged_at = data.logged_at or date.today().isoformat()
    # Upsert: replace if same date
    await db.execute(
        "DELETE FROM weight_logs WHERE user_id = ? AND logged_at = ?",
        (user["id"], str(logged_at)),
    )
    cursor = await db.execute(
        "INSERT INTO weight_logs (user_id, weight, unit, logged_at, notes) VALUES (?, ?, ?, ?, ?)",
        (user["id"], data.weight, data.unit, str(logged_at), data.notes),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM weight_logs WHERE id = ?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.get("/", response_model=list[WeightLogOut])
async def get_weight_history(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    start = (date.today() - timedelta(days=days)).isoformat()
    cursor = await db.execute(
        "SELECT * FROM weight_logs WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at",
        (user["id"], start),
    )
    return [dict(r) for r in await cursor.fetchall()]


@router.delete("/{log_id}")
async def delete_weight_log(
    log_id: int,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM weight_logs WHERE id = ? AND user_id = ?", (log_id, user["id"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Weight log not found")
    await db.execute("DELETE FROM weight_logs WHERE id = ?", (log_id,))
    await db.commit()
    return {"ok": True}
