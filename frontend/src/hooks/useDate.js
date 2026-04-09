import { useState } from 'react';

export function useDate() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const prev = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const next = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    const nd = d.toISOString().split('T')[0];
    if (nd <= today) setDate(nd);
  };

  const isToday = date === new Date().toISOString().split('T')[0];

  const formatDisplay = () => {
    if (isToday) return 'Today';
    const d = new Date(date + 'T12:00:00');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return { date, setDate, prev, next, isToday, formatDisplay };
}
