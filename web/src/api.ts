import axios from 'axios';

// Relative by default: Vite proxies /api to the backend, so this works on localhost and via ngrok
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    // Skips ngrok's free-tier browser warning page on API calls (ignored elsewhere)
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
}

export interface MagicLinkResponse {
  message: string;
  // Only returned when the backend runs with APP_ENV=development
  dev_link?: string;
}

export const authAPI = {
  requestMagicLink: async (email: string): Promise<MagicLinkResponse> => {
    const response = await api.post('/auth/request-magic-link', { email });
    return response.data;
  },
  verifyMagicLink: async (token: string) => {
    const response = await api.post('/auth/verify', { token });
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
