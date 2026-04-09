from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import auth, foods, meals, weight, workouts


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Nutri API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(foods.router)
app.include_router(meals.router)
app.include_router(weight.router)
app.include_router(workouts.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "nutri"}
