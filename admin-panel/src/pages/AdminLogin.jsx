import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import '../styles/auth.css';

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // AuthContext redirects if not admin
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        setError('Invalid email or password');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo-badge">🛡️</div>
            <h1 className="admin-login-title">Admin Panel</h1>
            <p className="admin-login-subtitle">Academic Resource Hub — Administrator Access</p>
          </div>

          <form className="admin-form" onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                className="admin-form-input"
                placeholder="admin@rru.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="admin-password">Password</label>
              <div className="password-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="admin-form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94C16.23 19.24 14.15 19.96 12 20C5 20 1 12 1 12C2.24 9.68 3.97 7.66 6.06 6.06M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.39 13.14 21.67 14.2 20.84 15.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className="admin-error">⚠️ {error}</div>}

            <button type="submit" className="admin-submit" disabled={loading}>
              {loading ? (
                <><span className="spinner"></span> Authenticating...</>
              ) : '🔐 Sign In to Admin Panel'}
            </button>
          </form>

          <p className="admin-role-notice">🔒 Restricted to administrators only</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
