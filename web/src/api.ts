import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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

export const authAPI = {
  requestMagicLink: async (email: string) => {
    return api.post('/auth/request-magic-link', { email });
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
