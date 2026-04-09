import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { Sun, Moon, LogOut, Target, User, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [goals, setGoals] = useState({
    calorie_goal: user?.calorie_goal || 2000,
    protein_goal: user?.protein_goal || 150,
    carb_goal: user?.carb_goal || 250,
    fat_goal: user?.fat_goal || 65,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getCalorieHistory(14).then(setHistory).catch(() => {});
  }, []);

  const saveGoals = async () => {
    setSaving(true);
    try {
      await api.updateGoals(goals);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const chartData = history.map(h => ({
    date: new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: Math.round(h.total_calories),
    goal: goals.calorie_goal,
  }));

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      {/* Account */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <User size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>Account</span>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">{user?.username}</div>
            <div className="settings-row-sub">{user?.email || 'No email set'}</div>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Theme</div>
          <div className="toggle-wrap">
            <Sun size={16} color="var(--text-tertiary)" />
            <div className={`toggle ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme} />
            <Moon size={16} color="var(--text-tertiary)" />
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <Target size={18} color="var(--accent)" />
          <span style={{ fontWeight: 600 }}>Daily Goals</span>
        </div>

        <div className="flex-col gap-md">
          <div className="grid-2">
            <div className="input-group">
              <label>Calories (kcal)</label>
              <input className="input" type="number" value={goals.calorie_goal}
                onChange={e => setGoals(g => ({ ...g, calorie_goal: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="input-group">
              <label>Protein (g)</label>
              <input className="input" type="number" value={goals.protein_goal}
                onChange={e => setGoals(g => ({ ...g, protein_goal: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Carbs (g)</label>
              <input className="input" type="number" value={goals.carb_goal}
                onChange={e => setGoals(g => ({ ...g, carb_goal: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="input-group">
              <label>Fat (g)</label>
              <input className="input" type="number" value={goals.fat_goal}
                onChange={e => setGoals(g => ({ ...g, fat_goal: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={saveGoals} disabled={saving}>
            {saving ? <span className="spinner" /> : saved ? 'Saved!' : 'Save Goals'}
          </button>
        </div>
      </div>

      {/* Calorie trend chart */}
      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <BarChart3 size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>14-Day Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} width={38} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                }}
              />
              <Bar dataKey="calories" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="goal" stroke="var(--danger)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Logout */}
      <button className="btn btn-danger btn-full" onClick={handleLogout}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}
