import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

export const Verify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        const { access_token } = await authAPI.verifyMagicLink(token);
        await login(access_token);
        navigate('/app/map');
      } catch (error) {
        setStatus('error');
      }
    };

    verify();
  }, [searchParams, navigate, login]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Verifying Login</h1>
        {status === 'loading' ? (
          <p>Please wait while we verify your magic link...</p>
        ) : (
          <div>
            <div className="alert alert-error">
              Invalid or expired magic link.
            </div>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
