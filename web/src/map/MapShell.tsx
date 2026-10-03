import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0 fill-none stroke-current stroke-[1.7]"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const NAV = [
  { to: '/app/map', label: 'Map', d: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14' },
  { to: '/app/screen', label: 'Screens', d: 'M4 5h16l-6 8v5l-4 2v-7z' },
  { to: '/app/auctions', label: 'Auctions', d: 'M13 3l6 6-3 3-6-6z M11 9l-7 7 2 2 7-7 M4 21h9' },
  { to: '/app/review', label: 'Review', d: 'M4 4h16v16H4z M8 12l3 3 5-6' },
  { to: '/app/admin', label: 'Admin', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', adminOnly: true },
];

export function MapShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper font-plex text-ink">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-line bg-white pr-5 pl-4">
        <NavLink to="/app/map" className="flex w-42.5 items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="1" y="1" width="26" height="26" rx="7" className="fill-forest" />
            <path
              d="M7 19l5-11 4 6 5-3"
              className="fill-none stroke-white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">BhumiLekh</span>
        </NavLink>
        <label className="flex h-9.5 w-140 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-muted">
          <Icon size={18}>
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" />
          </Icon>
          <input
            type="search"
            aria-label="Global search"
            placeholder="Search khasra, ULPIN, owner, village or RERA project"
            disabled
            title="Search is not available yet"
            className="flex-1 border-none bg-transparent text-sm text-ink outline-none"
          />
        </label>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-forest-soft text-[13px] font-semibold text-forest">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="flex flex-col leading-[1.2]">
            <span className="max-w-48 truncate text-[13px] font-medium">{user?.email}</span>
            <span className="text-[11.5px] text-muted capitalize">{user?.role}</span>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={logout}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-paper"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Main" className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-white pt-3">
          {NAV.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex w-13 flex-col items-center gap-0.75 rounded-[10px] py-2 text-[11px] font-medium ${
                  isActive ? 'bg-forest-soft text-forest' : 'text-muted'
                }`
              }
            >
              <Icon>
                <path d={item.d} />
              </Icon>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="relative flex min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
