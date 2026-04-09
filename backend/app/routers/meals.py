from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas import MealLogCreate, MealLogOut, DailySummary
from app.auth import get_current_user
from app.database import get_db
from datetime import date, timedelta
import aiosqlite

router = APIRouter(prefix="/api/meals", tags=["meals"])


@router.post("/", response_model=MealLogOut)
async def log_meal(
    data: MealLogCreate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    logged_at = data.logged_at or date.today().isoformat()
    cursor = await db.execute(
        """INSERT INTO meal_logs
        (user_id, food_item_id, food_name, meal_type, servings, calories, protein, carbs, fat, fiber, sugar, logged_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user["id"], data.food_item_id, data.food_name, data.meal_type,
            data.servings, data.calories, data.protein, data.carbs, data.fat,
            data.fiber, data.sugar, str(logged_at),
        ),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM meal_logs WHERE id = ?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.get("/", response_model=list[MealLogOut])
async def get_meals(
    date_str: str = Query(None, alias="date"),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    target = date_str or date.today().isoformat()
    cursor = await db.execute(
        "SELECT * FROM meal_logs WHERE user_id = ? AND logged_at = ? ORDER BY created_at DESC",
        (user["id"], target),
    )
    return [dict(r) for r in await cursor.fetchall()]


@router.delete("/{meal_id}")
async def delete_meal(
    meal_id: int,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        "SELECT id FROM meal_logs WHERE id = ? AND user_id = ?", (meal_id, user["id"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Meal not found")
    await db.execute("DELETE FROM meal_logs WHERE id = ?", (meal_id,))
    await db.commit()
    return {"ok": True}


@router.get("/summary")
async def daily_summary(
    date_str: str = Query(None, alias="date"),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    target = date_str or date.today().isoformat()
    cursor = await db.execute(
        """SELECT
            COALESCE(SUM(calories), 0) as total_calories,
            COALESCE(SUM(protein), 0) as total_protein,
            COALESCE(SUM(carbs), 0) as total_carbs,
            COALESCE(SUM(fat), 0) as total_fat,
            COALESCE(SUM(fiber), 0) as total_fiber,
            COUNT(*) as meal_count
        FROM meal_logs WHERE user_id = ? AND logged_at = ?""",
        (user["id"], target),
    )
    row = dict(await cursor.fetchone())

    # Workout calories
    cursor2 = await db.execute(
        "SELECT COALESCE(SUM(calories_burned), 0) as wc FROM workouts WHERE user_id = ? AND logged_at = ?",
        (user["id"], target),
    )
    wrow = dict(await cursor2.fetchone())

    return DailySummary(
        date=target,
        total_calories=row["total_calories"],
        total_protein=row["total_protein"],
        total_carbs=row["total_carbs"],
        total_fat=row["total_fat"],
        total_fiber=row["total_fiber"],
        meal_count=row["meal_count"],
        workout_calories=wrow["wc"],
    )


@router.get("/history")
async def calorie_history(
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    start = (date.today() - timedelta(days=days - 1)).isoformat()
    cursor = await db.execute(
        """SELECT logged_at as date,
            COALESCE(SUM(calories), 0) as total_calories,
            COALESCE(SUM(protein), 0) as total_protein,
            COALESCE(SUM(carbs), 0) as total_carbs,
            COALESCE(SUM(fat), 0) as total_fat
        FROM meal_logs
        WHERE user_id = ? AND logged_at >= ?
        GROUP BY logged_at
        ORDER BY logged_at""",
        (user["id"], start),
    )
    return [dict(r) for r in await cursor.fetchall()]
