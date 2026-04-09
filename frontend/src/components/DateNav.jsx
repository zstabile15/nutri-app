import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateNav({ formatDisplay, prev, next, isToday }) {
  return (
    <div className="date-nav">
      <button className="btn btn-icon btn-ghost" onClick={prev}>
        <ChevronLeft size={20} />
      </button>
      <span className="date-nav-label">{formatDisplay()}</span>
      <button className="btn btn-icon btn-ghost" onClick={next} disabled={isToday}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
