import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { Map, Settings, Gavel, ListChecks, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const Layout: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>BhumiLekh</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/app/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            Map
          </NavLink>
          <NavLink to="/app/screen" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            Screen Runner
          </NavLink>
          <NavLink to="/app/auctions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Gavel size={20} />
            Auctions
          </NavLink>
          <NavLink to="/app/review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ListChecks size={20} />
            Review Queue
          </NavLink>
          {/* Example of RBAC hiding UI (Backend still enforces auth!) */}
          {user.role === 'admin' && (
            <NavLink to="/app/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              Admin Settings
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-email">{user.email}</div>
            <div className="user-role">
              <span className={`role-badge ${user.role === 'admin' ? 'admin' : ''}`}>
                {user.role}
              </span>
            </div>
          </div>
          <button onClick={logout} className="btn-logout">
            <LogOut size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
