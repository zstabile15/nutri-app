import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import {
  Sun, Moon, LogOut, Target, User, BarChart3,
  Shield, UserPlus, Trash2, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, Line } from 'recharts';
import Modal from '../components/Modal';

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

  // Admin state
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [adminError, setAdminError] = useState('');

  const isAdmin = user?.is_admin;

  useEffect(() => {
    api.getCalorieHistory(14).then(setHistory).catch(() => {});
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch (err) { console.error(err); }
  };

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

  const handleAddUser = async () => {
    setAdminError('');
    if (!newUser.username || !newUser.password) {
      setAdminError('Username and password are required');
      return;
    }
    setAddingUser(true);
    try {
      await api.register({
        username: newUser.username,
        email: newUser.email || undefined,
        password: newUser.password,
      });
      setShowAddUser(false);
      setNewUser({ username: '', email: '', password: '' });
      loadUsers();
    } catch (err) {
      setAdminError(err.message);
    }
    setAddingUser(false);
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}" and all their data? This cannot be undone.`)) return;
    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
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
          {isAdmin && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px',
              background: 'var(--accent-muted)', color: 'var(--accent-text)',
              borderRadius: 'var(--radius-full)', textTransform: 'uppercase',
            }}>
              Admin
            </span>
          )}
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

      {/* Admin: User Management */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Shield size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600 }}>User Management</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(true)}>
              <UserPlus size={16} /> Add User
            </button>
          </div>

          {users.length === 0 ? (
            <div className="flex-center" style={{ padding: '16px', color: 'var(--text-tertiary)' }}>
              <span className="spinner" />
            </div>
          ) : (
            <div className="flex-col gap-sm">
              {users.map(u => (
                <div className="meal-item" key={u.id}>
                  <Users size={18} color="var(--text-tertiary)" />
                  <div className="meal-item-info">
                    <div className="meal-item-name">
                      {u.username}
                      {u.is_admin ? (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, marginLeft: '6px',
                          padding: '1px 6px', background: 'var(--accent-muted)',
                          color: 'var(--accent-text)', borderRadius: 'var(--radius-full)',
                          verticalAlign: 'middle',
                        }}>
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                    <div className="meal-item-detail">{u.email || 'No email'}</div>
                  </div>
                  {u.id !== user.id && (
                    <button className="btn btn-icon btn-ghost" onClick={() => handleDeleteUser(u.id, u.username)}>
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <button className="btn btn-danger btn-full" onClick={handleLogout}>
        <LogOut size={18} /> Sign Out
      </button>

      {/* Add User Modal */}
      {showAddUser && (
        <Modal title="Add New User" onClose={() => { setShowAddUser(false); setAdminError(''); }}>
          <div className="flex-col gap-md">
            {adminError && <div className="auth-error">{adminError}</div>}

            <div className="input-group">
              <label>Username</label>
              <input className="input" value={newUser.username}
                onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                placeholder="Username" autoFocus />
            </div>
            <div className="input-group">
              <label>Email (optional)</label>
              <input className="input" type="email" value={newUser.email}
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                placeholder="user@example.com" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                placeholder="Min. 6 characters" />
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? <span className="spinner" /> : <><UserPlus size={18} /> Create User</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
