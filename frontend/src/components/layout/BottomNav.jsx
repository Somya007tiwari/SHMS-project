import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  CreditCard,
  Stethoscope,
  Receipt,
  Activity,
  Menu,
} from 'lucide-react';

const NAV_ITEMS = {
  patient: [
    { path: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patient/book-appointment', label: 'Book', icon: Calendar },
    { path: '/patient/appointments', label: 'Appointments', icon: ClipboardList },
    { path: '/patient/billing', label: 'Bills', icon: CreditCard },
  ],
  doctor: [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/doctor/appointments', label: 'Appointments', icon: Calendar },
    { path: '/doctor/schedule', label: 'Schedule', icon: Activity },
    { path: '/doctor/prescriptions', label: 'Prescriptions', icon: ClipboardList },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { path: '/admin/appointments', label: 'Appointments', icon: Calendar },
    { path: '/admin/billing', label: 'Billing', icon: Receipt },
  ],
};

export default function BottomNav({ onOpenMore }) {
  const { user } = useAuth();
  const { isDark } = useTheme();

  if (!user || !user.role) return null;

  const role = user.role;
  const items = NAV_ITEMS[role] || NAV_ITEMS.patient;

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-lg transition-colors pb-safe ${
        isDark
          ? 'bg-gray-900/90 border-gray-800 text-gray-300'
          : 'bg-white/90 border-slate-200 text-slate-600'
      }`}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`
              }
            >
              <Icon size={20} className="mb-0.5" />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          );
        })}

        {/* "More" button to trigger mobile sidebar drawer */}
        <button
          onClick={onOpenMore}
          aria-label="Open full navigation menu"
          className="flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <Menu size={20} className="mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
