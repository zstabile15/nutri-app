from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas import WorkoutCreate, WorkoutOut
from app.auth import get_current_user
from app.database import get_db
from datetime import date, timedelta
import aiosqlite

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


@router.post("/", response_model=WorkoutOut)
async def log_workout(
    data: WorkoutCreate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    logged_at = data.logged_at or date.today().isoformat()
    cursor = await db.execute(
        """INSERT INTO workouts
        (user_id, name, workout_type, duration_minutes, calories_burned, notes, logged_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user["id"], data.name, data.workout_type, data.duration_minutes,
         data.calories_burned, data.notes, str(logged_at)),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM workouts WHERE id = ?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.get("/", response_model=list[WorkoutOut])
async def get_workouts(
    date_str: str = Query(None, alias="date"),
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    if date_str:
        cursor = await db.execute(
            "SELECT * FROM workouts WHERE user_id = ? AND logged_at = ? ORDER BY created_at DESC",
            (user["id"], date_str),
        )
    else:
        start = (date.today() - timedelta(days=days)).isoformat()
        cursor = await db.execute(
            "SELECT * FROM workouts WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC",
            (user["id"], start),
        )
    return [dict(r) for r in await cursor.fetchall()]


@router.delete("/{workout_id}")
async def delete_workout(
    workout_id: int,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM workouts WHERE id = ? AND user_id = ?", (workout_id, user["id"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Workout not found")
    await db.execute("DELETE FROM workouts WHERE id = ?", (workout_id,))
    await db.commit()
    return {"ok": True}
