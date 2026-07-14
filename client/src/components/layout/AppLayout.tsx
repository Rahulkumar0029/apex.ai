import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, History, BarChart3, User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/interview/new', label: 'New Interview', icon: Plus },
  { to: '/history', label: 'History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  // Load and apply theme from user settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('apex-theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-[128px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-900 bg-gray-900/60 backdrop-blur-md flex flex-col z-10 relative">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-black text-white shadow-lg shadow-violet-500/20">
              A
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Apex.ai
            </span>
          </div>
          {user?.planId === 'pro' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 font-bold tracking-wide uppercase">
              Pro
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-md shadow-violet-600/10'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0 transition-transform group-hover:scale-110" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User area */}
        <div className="border-t border-gray-900 p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 p-1">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[1.5px] flex-shrink-0">
              <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.displayName?.[0]?.toUpperCase() ?? 'U'
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.displayName ?? 'Candidate'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-900/30 transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-950 relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
export default AppLayout;
