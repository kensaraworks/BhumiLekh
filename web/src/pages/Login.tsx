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
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to BhumiLekh</h1>
        <p>Sign in with your email to continue</p>

        {status === 'success' ? (
          <div className="alert alert-success">
            Check your email for a magic link to sign in. (In development, check the backend console for the link).
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="alert alert-error">{errorMessage}</div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={status === 'loading'}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={status === 'loading' || !email}
            >
              {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
