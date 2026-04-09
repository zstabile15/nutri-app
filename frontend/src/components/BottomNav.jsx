import { NavLink } from 'react-router-dom';
import { Home, Search, Dumbbell, Weight, Settings } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <Home size={22} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/add" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Search size={22} />
        <span>Add</span>
      </NavLink>
      <NavLink to="/workouts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Dumbbell size={22} />
        <span>Workouts</span>
      </NavLink>
      <NavLink to="/weight" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Weight size={22} />
        <span>Weight</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={22} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
