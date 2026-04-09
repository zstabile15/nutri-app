import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Leaf } from 'lucide-react';

export default function OidcCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const err = searchParams.get('error');
    const errDesc = searchParams.get('error_description');

    if (err) {
      setError(errDesc || err);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    api.oidcCallback(code, state)
      .then(res => {
        loginWithToken(res.access_token, res.user);
        navigate('/');
      })
      .catch(err => {
        setError(err.message);
      });
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <Leaf size={36} color="var(--accent)" />
          <span>Nutri</span>
        </div>
        {error ? (
          <>
            <div className="auth-error">{error}</div>
            <button
              className="btn btn-secondary btn-full"
              style={{ marginTop: 'var(--space-md)' }}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </>
        ) : (
          <div className="flex-col gap-md" style={{ alignItems: 'center', padding: 'var(--space-xl) 0' }}>
            <span className="spinner" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Signing you in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
