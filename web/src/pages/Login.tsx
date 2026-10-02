import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

const gridLines = Array.from({ length: 16 }, (_, i) => -200 + i * 60);

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
    <div className="flex min-h-screen flex-col bg-paper font-plex text-ink lg:flex-row">
      <div className="relative min-h-44 overflow-hidden bg-forest text-white lg:w-1/2">
        <svg
          viewBox="0 0 720 900"
          preserveAspectRatio="xMinYMid slice"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          {gridLines.map((x) => (
            <path key={x} d={`M${x} 0 L${x + 120} 900`} className="stroke-white/10" strokeWidth="1" />
          ))}
          <path
            d="M120 520 L260 480 L300 600 L150 640 Z M260 480 L400 450 L430 570 L300 600 Z M150 640 L300 600 L320 720 L170 760 Z M300 600 L430 570 L460 690 L320 720 Z"
            className="fill-none stroke-white/45"
            strokeWidth="1.2"
          />
          <path
            d="M430 570 L560 540 L590 660 L460 690 Z"
            className="fill-none stroke-white/45"
            strokeWidth="1.2"
            strokeDasharray="6 5"
          />
        </svg>
        <div className="absolute left-6 top-6 flex items-center gap-3 lg:left-18 lg:top-18">
          <svg width="36" height="36" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="1" y="1" width="26" height="26" rx="7" className="fill-white" />
            <path
              d="M7 19l5-11 4 6 5-3"
              className="fill-none stroke-forest"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[22px] font-semibold">BhumiLekh</span>
        </div>
        <div className="absolute bottom-24 left-18 hidden w-130 lg:block">
          <p className="text-[34px] font-medium leading-[1.2] tracking-[-0.01em]">
            Madhya Pradesh land records, deeds and auctions on one map.
          </p>
          <p className="mt-4 text-[15px] leading-normal opacity-85">
            Internal tool for the investment team. Public sources only.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-100 max-w-full flex-col gap-5">
          <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Sign in</h1>
          <p className="text-[15px] leading-normal text-muted">We will email you a one-time sign-in link.</p>

          {status === 'success' ? (
            <p className="text-[15px] leading-normal">
              Check your email for a magic link to sign in. (In development, check the backend console for the link).
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-medium">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={status === 'loading'}
                  className="h-11 rounded-lg border border-line bg-white px-3 font-[family-name:inherit] text-[15px] focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="h-11 rounded-lg bg-forest text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          )}
          {status === 'error' && <p className="text-[13px] leading-normal text-red-600">{errorMessage}</p>}

          <p className="text-[13px] leading-normal text-muted">
            Only approved team emails receive a link. Sign-ins, dossier views and screen runs are logged.
          </p>
        </div>
      </div>
    </div>
  );
};
