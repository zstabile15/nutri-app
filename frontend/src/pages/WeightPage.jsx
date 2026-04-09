import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, TrendingDown, Scale } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';

export default function WeightPage() {
  const [logs, setLogs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(90);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getWeightHistory(days);
      setLogs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]);

  const handleSave = async () => {
    if (!weight) return;
    setSaving(true);
    try {
      await api.logWeight({ weight: parseFloat(weight), unit, notes: notes || undefined });
      setShowAdd(false);
      setWeight('');
      setNotes('');
      load();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await api.deleteWeight(id);
    load();
  };

  const chartData = logs.map(l => ({
    date: new Date(l.logged_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: l.weight,
  }));

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const prev = logs.length > 1 ? logs[logs.length - 2] : null;
  const diff = latest && prev ? latest.weight - prev.weight : null;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Weight</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Log
        </button>
      </div>

      {/* Stats cards */}
      {latest && (
        <div className="grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card flex-col" style={{ alignItems: 'center', gap: '4px' }}>
            <Scale size={20} color="var(--accent)" />
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{latest.weight}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{latest.unit} · current</span>
          </div>
          <div className="card flex-col" style={{ alignItems: 'center', gap: '4px' }}>
            <TrendingDown size={20} color={diff !== null && diff <= 0 ? 'var(--accent)' : 'var(--danger)'} />
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{latest.unit} · change</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-sm)' }}>
          <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
            {[30, 90, 180, 365].map(d => (
              <button key={d} className={`tab ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {logs.length === 0 && !loading && (
        <div className="empty-state">
          <Scale size={40} />
          <p>No weight entries yet.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Log Weight
          </button>
        </div>
      )}

      {loading && logs.length === 0 && (
        <div className="flex-center" style={{ padding: '48px 0' }}><span className="spinner" /></div>
      )}

      <div className="flex-col gap-sm">
        {[...logs].reverse().map(l => (
          <div className="meal-item" key={l.id}>
            <div className="meal-item-info">
              <div className="meal-item-name">{l.weight} {l.unit}</div>
              <div className="meal-item-detail">
                {new Date(l.logged_at + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {l.notes && ` · ${l.notes}`}
              </div>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(l.id)}>
              <Trash2 size={16} color="var(--danger)" />
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Log Weight" onClose={() => setShowAdd(false)}>
          <div className="flex-col gap-md">
            <div className="grid-2">
              <div className="input-group">
                <label>Weight</label>
                <input className="input" type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" autoFocus />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="select" value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Notes (optional)</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. morning weigh-in" />
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={!weight || saving}>
              {saving ? <span className="spinner" /> : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
