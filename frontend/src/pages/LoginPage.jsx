import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Leaf, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getOidcEnabled()
      .then(res => setOidcEnabled(res.enabled))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOidcLogin = async () => {
    setOidcLoading(true);
    setError('');
    try {
      const res = await api.getOidcLoginUrl();
      window.location.href = res.url;
    } catch (err) {
      setError(err.message);
      setOidcLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Leaf size={36} color="var(--accent)" />
          <span>Nutri</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* OIDC SSO button */}
        {oidcEnabled && (
          <>
            <button
              className="btn btn-secondary btn-lg btn-full"
              onClick={handleOidcLogin}
              disabled={oidcLoading}
              style={{ marginBottom: 'var(--space-md)' }}
            >
              {oidcLoading ? <span className="spinner" /> : <><LogIn size={18} /> Sign in with SSO</>}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              margin: 'var(--space-md) 0', color: 'var(--text-tertiary)', fontSize: '0.82rem',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-md">
          <div className="input-group">
            <label>Username</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              autoFocus={!oidcEnabled}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          Need an account? Contact your admin.
        </p>
      </div>
    </div>
  );
}
