from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas import FoodItemCreate, FoodItemOut
from app.auth import get_current_user
from app.database import get_db
from app.services.food_search import search_all, lookup_barcode_off
import aiosqlite

router = APIRouter(prefix="/api/foods", tags=["foods"])


@router.get("/search")
async def search_foods(
    q: str = Query(..., min_length=1),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    # Search local DB first
    cursor = await db.execute(
        """SELECT * FROM food_items
        WHERE (user_id = ? OR user_id IS NULL)
        AND name LIKE ?
        ORDER BY name LIMIT 10""",
        (user["id"], f"%{q}%"),
    )
    local = [dict(r) for r in await cursor.fetchall()]

    # Search external APIs
    external = await search_all(q)

    # Cache new external results
    for item in external:
        if item.get("source_id"):
            cursor = await db.execute(
                "SELECT id FROM food_items WHERE source = ? AND source_id = ?",
                (item["source"], item["source_id"]),
            )
            if not await cursor.fetchone():
                await db.execute(
                    """INSERT INTO food_items
                    (name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium,
                     serving_size, serving_unit, source, source_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        item["name"], item.get("brand"), item.get("barcode"),
                        item["calories"], item["protein"], item["carbs"], item["fat"],
                        item.get("fiber", 0), item.get("sugar", 0), item.get("sodium", 0),
                        item["serving_size"], item["serving_unit"],
                        item["source"], item["source_id"],
                    ),
                )
    await db.commit()

    # Merge, dedup
    seen_ids = {r["id"] for r in local}
    combined = local.copy()
    for item in external:
        # Check if we just cached it
        cursor = await db.execute(
            "SELECT * FROM food_items WHERE source = ? AND source_id = ?",
            (item["source"], item["source_id"]),
        )
        row = await cursor.fetchone()
        if row and dict(row)["id"] not in seen_ids:
            combined.append(dict(row))
            seen_ids.add(dict(row)["id"])

    return combined[:30]


@router.get("/barcode/{barcode}")
async def lookup_barcode(
    barcode: str,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    # Check local first
    cursor = await db.execute(
        "SELECT * FROM food_items WHERE barcode = ?", (barcode,)
    )
    local = await cursor.fetchone()
    if local:
        return dict(local)

    # Try Open Food Facts
    result = lookup_barcode_off(barcode)
    import asyncio
    result = await lookup_barcode_off(barcode)
    if result:
        cursor = await db.execute(
            """INSERT INTO food_items
            (name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium,
             serving_size, serving_unit, source, source_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                result["name"], result.get("brand"), result.get("barcode"),
                result["calories"], result["protein"], result["carbs"], result["fat"],
                result.get("fiber", 0), result.get("sugar", 0), result.get("sodium", 0),
                result["serving_size"], result["serving_unit"],
                result["source"], result["source_id"],
            ),
        )
        await db.commit()
        # Fetch the inserted row
        cursor = await db.execute("SELECT * FROM food_items WHERE id = ?", (cursor.lastrowid,))
        return dict(await cursor.fetchone())

    raise HTTPException(status_code=404, detail="Product not found")


@router.post("/custom", response_model=FoodItemOut)
async def create_custom_food(
    data: FoodItemCreate,
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        """INSERT INTO food_items
        (user_id, name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium,
         serving_size, serving_unit, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom')""",
        (
            user["id"], data.name, data.brand, data.barcode,
            data.calories, data.protein, data.carbs, data.fat,
            data.fiber, data.sugar, data.sodium,
            data.serving_size, data.serving_unit,
        ),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM food_items WHERE id = ?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.get("/recent")
async def recent_foods(
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        """SELECT DISTINCT fi.* FROM food_items fi
        JOIN meal_logs ml ON fi.id = ml.food_item_id
        WHERE ml.user_id = ?
        ORDER BY ml.created_at DESC LIMIT 20""",
        (user["id"],),
    )
    return [dict(r) for r in await cursor.fetchall()]
