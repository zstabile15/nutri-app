from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# Auth
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: Optional[str] = None
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_admin: bool = False
    calorie_goal: int = 2000
    protein_goal: int = 150
    carb_goal: int = 250
    fat_goal: int = 65


class UserGoalsUpdate(BaseModel):
    calorie_goal: Optional[int] = None
    protein_goal: Optional[int] = None
    carb_goal: Optional[int] = None
    fat_goal: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Food
class FoodItemCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    serving_size: float = 100
    serving_unit: str = "g"


class FoodItemOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    serving_size: float
    serving_unit: str
    source: str = "custom"


# Meal Log
class MealLogCreate(BaseModel):
    food_item_id: Optional[int] = None
    food_name: str
    meal_type: str = "snack"
    servings: float = 1
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    logged_at: Optional[date] = None


class MealLogOut(BaseModel):
    id: int
    user_id: int
    food_item_id: Optional[int] = None
    food_name: str
    meal_type: str
    servings: float
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    logged_at: str
    created_at: Optional[str] = None


# Weight
class WeightLogCreate(BaseModel):
    weight: float
    unit: str = "lbs"
    logged_at: Optional[date] = None
    notes: Optional[str] = None


class WeightLogOut(BaseModel):
    id: int
    user_id: int
    weight: float
    unit: str
    logged_at: str
    notes: Optional[str] = None


# Workout
class WorkoutCreate(BaseModel):
    name: str
    workout_type: str = "cardio"
    duration_minutes: int = 0
    calories_burned: float = 0
    notes: Optional[str] = None
    logged_at: Optional[date] = None


class WorkoutOut(BaseModel):
    id: int
    user_id: int
    name: str
    workout_type: str
    duration_minutes: int
    calories_burned: float
    notes: Optional[str] = None
    logged_at: str


# Dashboard
class DailySummary(BaseModel):
    date: str
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    meal_count: int
    workout_calories: float


class OIDCLoginURL(BaseModel):
    url: str


class SetupStatus(BaseModel):
    needs_setup: bool
    admin_exists: bool


class AdminSetup(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: Optional[str] = None
    password: str = Field(min_length=6)


class AdminUserList(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_admin: bool
    created_at: Optional[str] = None
