import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, WalletCards, Sparkles, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeContext';

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <Receipt size={20} /> },
    { name: 'Budgets', path: '/budgets', icon: <WalletCards size={20} /> },
    { name: 'AI Insights', path: '/insights', icon: <Sparkles size={20} /> },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-surface border-r border-subtle w-64 text-main font-sans">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl heading-text font-bold text-accent">FinTracker</h1>
        <button className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent/10 border-l-4 border-accent text-accent font-semibold'
                  : 'text-muted hover:bg-subtle hover:text-main border-l-4 border-transparent'
              }`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-subtle">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="text-sm truncate">
            <p className="font-semibold">{user?.user_metadata?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-subtle text-muted">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center space-x-2 w-full px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-main overflow-hidden">
      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:hidden flex`}
      >
        <SidebarContent />
        <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto relative">
        <header className="md:hidden bg-surface border-b border-subtle p-4 flex items-center justify-between sticky top-0 z-10 w-full">
          <h1 className="text-xl heading-text font-bold text-accent">FinTracker</h1>
          <button onClick={() => setMobileMenuOpen(true)} className="text-main">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
