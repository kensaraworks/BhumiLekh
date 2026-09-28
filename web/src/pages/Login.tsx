import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/map');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    setErrorMessage('');
    
    try {
      await authAPI.requestMagicLink(email);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to send magic link. Please try again later.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual-panel" />
      <div className="login-form-panel">
        <h1 className="login-brand">BhumiLekh</h1>

        {status === 'success' ? (
          <p className="login-message">
            Check your email for a magic link to sign in. (In development, check the backend console for the link).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="login-pill">
            <input
              id="email"
              type="email"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={status === 'loading'}
            />
            <button type="submit" disabled={status === 'loading' || !email}>
              {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="login-message error">{errorMessage}</p>}

        <div className="cookie-notice">
          We use cookies to keep you signed in and to improve your experience.
        </div>
      </div>
    </div>
  );
};
