import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import AddFoodPage from './pages/AddFoodPage';
import WeightPage from './pages/WeightPage';
import WorkoutsPage from './pages/WorkoutsPage';
import SettingsPage from './pages/SettingsPage';
import OidcCallbackPage from './pages/OidcCallbackPage';

function ProtectedRoute({ children }) {
  const { user, loading, needsSetup } = useAuth();
  if (loading || needsSetup === null) {
    return (
      <div className="flex-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner" />
      </div>
    );
  }
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading, needsSetup } = useAuth();
  if (loading || needsSetup === null) {
    return (
      <div className="flex-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner" />
      </div>
    );
  }
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function SetupRoute({ children }) {
  const { loading, needsSetup } = useAuth();
  if (loading || needsSetup === null) {
    return (
      <div className="flex-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner" />
      </div>
    );
  }
  if (!needsSetup) return <Navigate to="/login" replace />;
  return children;
}

function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddFoodPage /></ProtectedRoute>} />
          <Route path="/weight" element={<ProtectedRoute><WeightPage /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute><WorkoutsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/setup" element={<SetupRoute><SetupPage /></SetupRoute>} />
          <Route path="/oidc/callback" element={<OidcCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AuthBottomNav />
    </div>
  );
}

function AuthBottomNav() {
  const { user } = useAuth();
  if (!user) return null;
  return <BottomNav />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
