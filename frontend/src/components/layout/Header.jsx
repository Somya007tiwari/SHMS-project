import React, { useState } from 'react';
import { Menu, Sun, Moon, Bell, Search, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';

const Header = ({ onMenuToggle, title }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-30 flex items-center gap-4 px-4 py-3 border-b
      ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'}
      shadow-sm`}>
      
      {/* Menu Toggle (Mobile) */}
      <button
        onClick={onMenuToggle}
        className={`lg:hidden p-2 rounded-xl ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-600'}`}
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <h1 className={`font-bold text-lg hidden sm:block ${isDark ? 'text-white' : 'text-slate-800'}`}>
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
        ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
        <Search size={16} />
        <span>Search...</span>
        <span className="text-xs bg-slate-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">⌘K</span>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all
          ${isDark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <Link to="/notifications" className="relative">
        <button className={`p-2 rounded-xl transition-all
          ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </Link>

      {/* Profile Dropdown */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all
            ${isDark ? 'hover:bg-gray-800' : 'hover:bg-slate-100'}`}
        >
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className={`hidden sm:block text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
            {user?.firstName}
          </span>
          <ChevronDown size={14} className={isDark ? 'text-gray-400' : 'text-slate-400'} />
        </button>

        {profileOpen && (
          <div
            className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border z-50
              ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-100'}`}
            onBlur={() => setProfileOpen(false)}
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
              <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <div className="p-1">
              <Link to="/profile" onClick={() => setProfileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                  ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}>
                <User size={16} /> Profile Settings
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
