import aiosqlite

from app.config import get_settings


def get_db_path() -> str:
    return get_settings().database_path


async def get_db():
    db = await aiosqlite.connect(get_db_path())
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    db = await aiosqlite.connect(get_db_path())
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")

    await db.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        oidc_sub TEXT UNIQUE,
        calorie_goal INTEGER DEFAULT 2000,
        protein_goal INTEGER DEFAULT 150,
        carb_goal INTEGER DEFAULT 250,
        fat_goal INTEGER DEFAULT 65,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        brand TEXT,
        barcode TEXT,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        sodium REAL DEFAULT 0,
        serving_size REAL DEFAULT 100,
        serving_unit TEXT DEFAULT 'g',
        source TEXT DEFAULT 'custom',
        source_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_food_barcode ON food_items(barcode);
    CREATE INDEX IF NOT EXISTS idx_food_name ON food_items(name);
    CREATE INDEX IF NOT EXISTS idx_food_source ON food_items(source, source_id);

    CREATE TABLE IF NOT EXISTS meal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        food_item_id INTEGER,
        food_name TEXT NOT NULL,
        meal_type TEXT DEFAULT 'snack',
        servings REAL DEFAULT 1,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        logged_at DATE DEFAULT (date('now')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE INDEX IF NOT EXISTS idx_meal_user_date ON meal_logs(user_id, logged_at);

    CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        unit TEXT DEFAULT 'lbs',
        logged_at DATE DEFAULT (date('now')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, logged_at);

    CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        workout_type TEXT DEFAULT 'cardio',
        duration_minutes INTEGER DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        notes TEXT,
        logged_at DATE DEFAULT (date('now')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_workout_user_date ON workouts(user_id, logged_at);
    """)

    await db.commit()
    await db.close()
