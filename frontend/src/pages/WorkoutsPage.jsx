import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Dumbbell, Timer, Flame } from 'lucide-react';
import { api } from '../api';
import { useDate } from '../hooks/useDate';
import DateNav from '../components/DateNav';
import Modal from '../components/Modal';

const WORKOUT_TYPES = ['cardio', 'strength', 'flexibility', 'sports', 'other'];

const PRESETS = [
  { name: 'Running', type: 'cardio', calsPer: 10 },
  { name: 'Walking', type: 'cardio', calsPer: 4 },
  { name: 'Cycling', type: 'cardio', calsPer: 8 },
  { name: 'Swimming', type: 'cardio', calsPer: 9 },
  { name: 'Weight Training', type: 'strength', calsPer: 6 },
  { name: 'HIIT', type: 'cardio', calsPer: 12 },
  { name: 'Yoga', type: 'flexibility', calsPer: 3 },
  { name: 'Jump Rope', type: 'cardio', calsPer: 11 },
];

export default function WorkoutsPage() {
  const { date, prev, next, isToday, formatDisplay } = useDate();
  const [workouts, setWorkouts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', workout_type: 'cardio', duration_minutes: 30, calories_burned: 0, notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWorkouts(date);
      setWorkouts(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.logWorkout({ ...form, logged_at: date });
      setShowAdd(false);
      setForm({ name: '', workout_type: 'cardio', duration_minutes: 30, calories_burned: 0, notes: '' });
      load();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await api.deleteWorkout(id);
    load();
  };

  const applyPreset = (preset) => {
    setForm(f => ({
      ...f,
      name: preset.name,
      workout_type: preset.type,
      calories_burned: preset.calsPer * f.duration_minutes,
    }));
  };

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0);
  const totalMins = workouts.reduce((s, w) => s + w.duration_minutes, 0);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Workouts</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Log
        </button>
      </div>

      <DateNav formatDisplay={formatDisplay} prev={prev} next={next} isToday={isToday} />

      {workouts.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card flex-col" style={{ alignItems: 'center', gap: '4px' }}>
            <Flame size={20} color="var(--warning)" />
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{Math.round(totalBurned)}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>kcal burned</span>
          </div>
          <div className="card flex-col" style={{ alignItems: 'center', gap: '4px' }}>
            <Timer size={20} color="var(--info)" />
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{totalMins}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>minutes</span>
          </div>
        </div>
      )}

      {loading && workouts.length === 0 && (
        <div className="flex-center" style={{ padding: '48px 0' }}><span className="spinner" /></div>
      )}

      {workouts.length === 0 && !loading && (
        <div className="empty-state">
          <Dumbbell size={40} />
          <p>No workouts logged for this day.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Log Workout
          </button>
        </div>
      )}

      <div className="flex-col gap-sm">
        {workouts.map(w => (
          <div className="meal-item" key={w.id}>
            <div className="meal-item-info">
              <div className="meal-item-name">{w.name}</div>
              <div className="meal-item-detail">
                {w.duration_minutes}min · {w.workout_type}
                {w.notes && ` · ${w.notes}`}
              </div>
            </div>
            <span className="meal-item-cals" style={{ color: 'var(--warning)' }}>
              -{Math.round(w.calories_burned)}
            </span>
            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(w.id)}>
              <Trash2 size={16} color="var(--danger)" />
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Log Workout" onClose={() => setShowAdd(false)}>
          <div className="flex-col gap-md">
            <p className="section-title">Quick Add</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
              {PRESETS.map(p => (
                <button key={p.name} className="btn btn-secondary btn-sm" onClick={() => applyPreset(p)}>
                  {p.name}
                </button>
              ))}
            </div>

            <div className="input-group">
              <label>Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Run" />
            </div>

            <div className="input-group">
              <label>Type</label>
              <select className="select" value={form.workout_type} onChange={e => setForm(f => ({ ...f, workout_type: e.target.value }))}>
                {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Duration (min)</label>
                <input className="input" type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="input-group">
                <label>Calories burned</label>
                <input className="input" type="number" value={form.calories_burned} onChange={e => setForm(f => ({ ...f, calories_burned: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="input-group">
              <label>Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={!form.name || saving}>
              {saving ? <span className="spinner" /> : 'Save Workout'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
