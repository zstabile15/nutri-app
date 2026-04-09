import httpx
from typing import Optional
from app.config import get_settings

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OFF_BARCODE_URL = "https://world.openfoodfacts.org/api/v2/product"
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


def _parse_off_product(p: dict) -> Optional[dict]:
    """Parse an Open Food Facts product into our format."""
    nutr = p.get("nutriments", {})
    name = p.get("product_name", "").strip()
    if not name:
        return None

    return {
        "name": name,
        "brand": p.get("brands", ""),
        "barcode": p.get("code", ""),
        "calories": round(nutr.get("energy-kcal_100g", nutr.get("energy-kcal", 0)) or 0, 1),
        "protein": round(nutr.get("proteins_100g", 0) or 0, 1),
        "carbs": round(nutr.get("carbohydrates_100g", 0) or 0, 1),
        "fat": round(nutr.get("fat_100g", 0) or 0, 1),
        "fiber": round(nutr.get("fiber_100g", 0) or 0, 1),
        "sugar": round(nutr.get("sugars_100g", 0) or 0, 1),
        "sodium": round(nutr.get("sodium_100g", 0) or 0, 1),
        "serving_size": 100,
        "serving_unit": "g",
        "source": "openfoodfacts",
        "source_id": p.get("code", ""),
    }


def _parse_usda_food(f: dict) -> Optional[dict]:
    """Parse a USDA FoodData Central food into our format."""
    nutrients = {}
    for n in f.get("foodNutrients", []):
        nid = n.get("nutrientId", 0)
        val = n.get("value", 0) or 0
        if nid == 1008:
            nutrients["calories"] = round(val, 1)
        elif nid == 1003:
            nutrients["protein"] = round(val, 1)
        elif nid == 1005:
            nutrients["carbs"] = round(val, 1)
        elif nid == 1004:
            nutrients["fat"] = round(val, 1)
        elif nid == 1079:
            nutrients["fiber"] = round(val, 1)
        elif nid == 2000:
            nutrients["sugar"] = round(val, 1)
        elif nid == 1093:
            nutrients["sodium"] = round(val, 1)

    name = f.get("description", "").strip()
    if not name:
        return None

    brand = f.get("brandOwner", "") or f.get("brandName", "") or ""

    return {
        "name": name,
        "brand": brand,
        "barcode": f.get("gtinUpc", ""),
        "calories": nutrients.get("calories", 0),
        "protein": nutrients.get("protein", 0),
        "carbs": nutrients.get("carbs", 0),
        "fat": nutrients.get("fat", 0),
        "fiber": nutrients.get("fiber", 0),
        "sugar": nutrients.get("sugar", 0),
        "sodium": nutrients.get("sodium", 0),
        "serving_size": 100,
        "serving_unit": "g",
        "source": "usda",
        "source_id": str(f.get("fdcId", "")),
    }


async def search_open_food_facts(query: str, page: int = 1) -> list[dict]:
    """Search Open Food Facts by text query."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                OFF_SEARCH_URL,
                params={
                    "search_terms": query,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
                    "page": page,
                    "page_size": 15,
                    "fields": "code,product_name,brands,nutriments",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for p in data.get("products", []):
                parsed = _parse_off_product(p)
                if parsed:
                    results.append(parsed)
            return results
    except Exception:
        return []


async def lookup_barcode_off(barcode: str) -> Optional[dict]:
    """Lookup a product by barcode on Open Food Facts."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{OFF_BARCODE_URL}/{barcode}.json",
                params={"fields": "code,product_name,brands,nutriments"},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") == 1 and data.get("product"):
                return _parse_off_product(data["product"])
    except Exception:
        pass
    return None


async def search_usda(query: str, page: int = 1) -> list[dict]:
    """Search USDA FoodData Central."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                USDA_SEARCH_URL,
                params={
                    "api_key": settings.usda_api_key,
                    "query": query,
                    "pageSize": 15,
                    "pageNumber": page,
                    "dataType": "Foundation,SR Legacy,Branded",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for f in data.get("foods", []):
                parsed = _parse_usda_food(f)
                if parsed:
                    results.append(parsed)
            return results
    except Exception:
        return []


async def search_all(query: str, page: int = 1) -> list[dict]:
    """Search both OFF and USDA, merge results."""
    import asyncio
    off_results, usda_results = await asyncio.gather(
        search_open_food_facts(query, page),
        search_usda(query, page),
    )
    # Interleave results, OFF first
    merged = []
    seen_names = set()
    for item in off_results + usda_results:
        key = (item["name"].lower(), item.get("brand", "").lower())
        if key not in seen_names:
            seen_names.add(key)
            merged.append(item)
    return merged[:25]
