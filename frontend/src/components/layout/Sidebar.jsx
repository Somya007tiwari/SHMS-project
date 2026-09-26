import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Building2,
  Calendar,
  Receipt,
  FileText,
  FlaskConical,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Activity,
  ClipboardList,
  Heart,
  MessageCircle,
  LogOut,
  X,
} from "lucide-react";

const ADMIN_NAV = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { path: "/admin/patients", label: "Patients", icon: Users },
  { path: "/admin/departments", label: "Departments", icon: Building2 },
  { path: "/admin/appointments", label: "Appointments", icon: Calendar },
  { path: "/admin/billing", label: "Billing", icon: Receipt },
  { path: "/admin/logs", label: "Activity Logs", icon: Activity },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

const DOCTOR_NAV = [
  { path: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/doctor/appointments", label: "Appointments", icon: Calendar },
  { path: "/doctor/patients", label: "My Patients", icon: Users },
  {
    path: "/doctor/prescriptions",
    label: "Prescriptions",
    icon: ClipboardList,
  },
  { path: "/doctor/reports", label: "Reports", icon: FileText },
  { path: "/doctor/schedule", label: "Schedule", icon: Activity },
];

const PATIENT_NAV = [
  { path: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    path: "/patient/book-appointment",
    label: "Book Appointment",
    icon: Calendar,
  },
  {
    path: "/patient/appointments",
    label: "My Appointments",
    icon: ClipboardList,
  },
  { path: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { path: "/patient/reports", label: "Medical Reports", icon: FlaskConical },
  { path: "/patient/billing", label: "Billing", icon: Receipt },
];

const SHARED_NAV = [
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/ai-assistant", label: "AI Assistant", icon: MessageCircle },
  { path: "/profile", label: "Profile", icon: UserRound },
];

const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  const navItems =
    user?.role === "admin"
      ? ADMIN_NAV
      : user?.role === "doctor"
        ? DOCTOR_NAV
        : PATIENT_NAV;

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <NavLink
        to={item.path}
        onClick={isMobile ? onClose : undefined}
        className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl mx-2 mb-1 text-sm font-medium transition-all
          ${
            isActive
              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        title={collapsed ? item.label : ""}
      >
        <Icon size={20} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          relative top-0 left-0 h-screen z-50 flex flex-col sidebar
          ${
                  isMobile
              ? `${isOpen ? "translate-x-0" : "-translate-x-full"} w-64 transition-transform duration-300`
              : sidebarWidth
          }
          ${isDark ? "bg-gray-900 border-r border-gray-800" : "bg-white border-r border-slate-100"}
          shadow-xl transition-all duration-300
        `}
      >
        {/* Logo */}
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-5 border-b ${isDark ? "border-gray-800" : "border-slate-100"}`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Heart size={18} className="text-white" />
              </div>
              <div>
                <p
                  className={`font-bold text-sm leading-tight ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  SHMS
                </p>
                <p className="text-xs text-slate-400">Hospital System</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </div>
          )}
          {isMobile ? (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`p-1.5 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-slate-100 text-slate-400"}`}
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          )}
        </div>

        {/* User Badge */}
        {!collapsed && (
          <div
            className={`mx-3 mt-4 mb-2 p-3 rounded-xl ${isDark ? "bg-gray-800" : "bg-blue-50"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p
                  className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  {user?.role === "doctor" ? "Dr. " : ""}
                  {user?.firstName} {user?.lastName}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                  ${
                    user?.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : user?.role === "doctor"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <div className="mb-2">
            {!collapsed && (
              <p
                className={`px-5 py-1 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"}`}
              >
                Menu
              </p>
            )}
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>

          <div
            className={`mt-4 pt-4 border-t ${isDark ? "border-gray-800" : "border-slate-100"}`}
          >
            {!collapsed && (
              <p
                className={`px-5 py-1 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"}`}
              >
                General
              </p>
            )}
            {SHARED_NAV.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div
          className={`p-3 border-t ${isDark ? "border-gray-800" : "border-slate-100"}`}
        >
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
              text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={20} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
