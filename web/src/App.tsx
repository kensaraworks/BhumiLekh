import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './pages/Login';
import { Verify } from './pages/Verify';
import { Layout } from './pages/Layout';
import { MapWorkspace } from './map/MapWorkspace';
import { Auctions, ReviewQueue, Placeholder } from './pages/Placeholders';
import { ScreenRunnerPage } from './screens/ScreenRunnerPage';

const queryClient = new QueryClient();

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/app/map" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/verify" element={<Verify />} />
          
            <Route path="/app/map" element={<RequireAuth><MapWorkspace /></RequireAuth>} />
            <Route path="/app/screen" element={<RequireAuth><ScreenRunnerPage /></RequireAuth>} />
            <Route path="/app" element={<Layout />}>
              <Route index element={<Navigate to="/app/map" replace />} />
              <Route path="auctions" element={<Auctions />} />
              <Route path="review" element={<ReviewQueue />} />
              <Route path="admin" element={<Placeholder title="Admin Settings" desc="Admin functionality placeholder." />} />
            </Route>
          
            <Route path="*" element={<Navigate to="/app/map" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
