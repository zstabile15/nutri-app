export function CalorieRing({ consumed, goal, burned }) {
  const net = consumed - burned;
  const remaining = Math.max(0, goal - net);
  const pct = Math.min(1, net / (goal || 1));
  const r = 66;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div className="macro-ring-container">
      <div className="macro-ring">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border-color)" strokeWidth="8" />
          <circle
            cx="80" cy="80" r={r} fill="none"
            stroke={pct >= 1 ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s var(--ease-out)' }}
          />
        </svg>
        <div className="macro-ring-label">
          <span className="value">{Math.round(remaining)}</span>
          <span className="sub">remaining</span>
        </div>
      </div>
    </div>
  );
}

export function MacroBars({ protein, carbs, fat, goals }) {
  const items = [
    { label: 'Protein', value: protein, goal: goals.protein_goal, color: 'var(--protein-color)' },
    { label: 'Carbs', value: carbs, goal: goals.carb_goal, color: 'var(--carbs-color)' },
    { label: 'Fat', value: fat, goal: goals.fat_goal, color: 'var(--fat-color)' },
  ];

  return (
    <div className="macro-bars">
      {items.map(m => {
        const pct = Math.min(100, (m.value / (m.goal || 1)) * 100);
        return (
          <div className="macro-bar-item" key={m.label}>
            <span className="macro-val">{Math.round(m.value)}g</span>
            <div className="macro-bar-track">
              <div
                className="macro-bar-fill"
                style={{ height: `${pct}%`, background: m.color }}
              />
            </div>
            <span className="macro-label">{m.label}</span>
            <span className="macro-label">{m.goal}g</span>
          </div>
        );
      })}
    </div>
  );
}
