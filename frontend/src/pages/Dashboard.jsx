import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Flame, Utensils } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDate } from '../hooks/useDate';
import { CalorieRing, MacroBars } from '../components/MacroDisplay';
import DateNav from '../components/DateNav';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Dashboard() {
  const { user } = useAuth();
  const { date, prev, next, isToday, formatDisplay } = useDate();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, w] = await Promise.all([
        api.getDailySummary(date),
        api.getMeals(date),
        api.getWorkouts(date),
      ]);
      setSummary(s);
      setMeals(m);
      setWorkouts(w);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const deleteMeal = async (id) => {
    await api.deleteMeal(id);
    load();
  };

  const grouped = MEAL_TYPES.map(type => ({
    type,
    items: meals.filter(m => m.meal_type === type),
    cals: meals.filter(m => m.meal_type === type).reduce((s, m) => s + m.calories, 0),
  })).filter(g => g.items.length > 0);

  const goals = user || { calorie_goal: 2000, protein_goal: 150, carb_goal: 250, fat_goal: 65 };

  return (
    <div>
      <DateNav formatDisplay={formatDisplay} prev={prev} next={next} isToday={isToday} />

      {summary && (
        <div className="flex-col gap-lg" style={{ marginBottom: 'var(--space-lg)' }}>
          <CalorieRing
            consumed={summary.total_calories}
            goal={goals.calorie_goal}
            burned={summary.workout_calories}
          />

          <div className="flex-center gap-lg" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span><Utensils size={14} style={{ verticalAlign: -2 }} /> {Math.round(summary.total_calories)} eaten</span>
            <span><Flame size={14} style={{ verticalAlign: -2 }} /> {Math.round(summary.workout_calories)} burned</span>
          </div>

          <MacroBars
            protein={summary.total_protein}
            carbs={summary.total_carbs}
            fat={summary.total_fat}
            goals={goals}
          />
        </div>
      )}

      {loading && !summary && (
        <div className="flex-center" style={{ padding: '48px 0' }}>
          <span className="spinner" />
        </div>
      )}

      {grouped.length === 0 && !loading && (
        <div className="empty-state">
          <Utensils size={40} />
          <p>No meals logged for this day.</p>
          <button className="btn btn-primary" onClick={() => navigate('/add')}>
            <Plus size={18} /> Log a Meal
          </button>
        </div>
      )}

      {grouped.map(g => (
        <div className="meal-section" key={g.type}>
          <div className="meal-section-header">
            <span className="meal-section-title">{g.type}</span>
            <span className="meal-section-cals">{Math.round(g.cals)} kcal</span>
          </div>
          {g.items.map(item => (
            <div className="meal-item" key={item.id}>
              <div className="meal-item-info">
                <div className="meal-item-name">{item.food_name}</div>
                <div className="meal-item-detail">
                  {item.servings !== 1 ? `${item.servings}x · ` : ''}
                  P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                </div>
              </div>
              <span className="meal-item-cals">{Math.round(item.calories)}</span>
              <button className="btn btn-icon btn-ghost" onClick={() => deleteMeal(item.id)}>
                <Trash2 size={16} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {workouts.length > 0 && (
        <div className="meal-section">
          <div className="meal-section-header">
            <span className="meal-section-title">Workouts</span>
          </div>
          {workouts.map(w => (
            <div className="meal-item" key={w.id}>
              <div className="meal-item-info">
                <div className="meal-item-name">{w.name}</div>
                <div className="meal-item-detail">{w.duration_minutes}min · {w.workout_type}</div>
              </div>
              <span className="meal-item-cals" style={{ color: 'var(--warning)' }}>
                -{Math.round(w.calories_burned)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
