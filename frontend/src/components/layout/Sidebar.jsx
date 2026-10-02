import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import {
  LayoutDashboard,
  Users,
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
  UserRound,
  Sparkles,
  Clock,
} from "lucide-react";

// ===============================
// NAVIGATION CONFIG
// ===============================

const ADMIN_NAV = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { path: "/admin/patients", label: "Patients", icon: Users },
  { path: "/admin/departments", label: "Departments", icon: Building2 },
  { path: "/admin/appointments", label: "Appointments", icon: Calendar },
  { path: "/admin/medical-records", label: "Medical Records", icon: FileText },
  { path: "/admin/prescriptions", label: "Prescriptions", icon: ClipboardList },
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
  { path: "/doctor/leaves", label: "Leaves", icon: Clock },
  { path: "/doctor/billing", label: "Invoices", icon: Receipt },
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
  { path: "/patient/medical-records", label: "Medical Records", icon: FileText },
  { path: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { path: "/patient/reports", label: "Medical Reports", icon: FlaskConical },
  { path: "/patient/billing", label: "Billing", icon: Receipt },
];

const SHARED_NAV = [
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/ai-assistant", label: "AI Assistant", icon: MessageCircle },
  { path: "/profile", label: "Profile", icon: UserRound },
];

// ===============================
// NAV ITEM (defined outside Sidebar so it is not re-created every render,
// which is what lets the CSS transitions actually animate)
// ===============================

const NavItem = ({ item, collapsed, isDark, onNavigate }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          "group relative flex items-center mx-3 mb-1 py-2.5 rounded-xl text-sm font-medium",
          "transition-all duration-300",
          collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3",
          isActive
            ? isDark
              ? "bg-gradient-to-r from-blue-500/15 to-transparent text-blue-400"
              : "bg-gradient-to-r from-blue-50 to-white text-[#1E3A5F]"
            : isDark
              ? "text-slate-400 hover:bg-slate-800 hover:text-white"
              : "text-slate-500 hover:bg-slate-50 hover:text-[#1E3A5F]",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar (animates in) */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full origin-center transition-all duration-300 ${
              isDark ? "bg-blue-400" : "bg-[#3B82F6]"
            } ${isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}`}
          />

          {/* Icon */}
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all duration-200 ${
              isActive
                ? isDark
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-blue-100 text-[#3B82F6]"
                : isDark
                  ? "text-slate-500 group-hover:bg-slate-700 group-hover:text-blue-400"
                  : "text-slate-400 group-hover:bg-blue-50 group-hover:text-[#3B82F6]"
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.3 : 2} />
          </span>

          {/* Label (fades and shrinks instead of popping out) */}
          <span
            className={`truncate whitespace-nowrap overflow-hidden transition-all duration-300 ${
              collapsed
                ? "max-w-0 opacity-0"
                : "max-w-[170px] opacity-100 flex-1"
            }`}
          >
            {item.label}
          </span>

          {/* Active dot */}
          {!collapsed && isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
};

// ===============================
// SIDEBAR
// ===============================

const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const [collapsedState, setCollapsedState] = useState(false);

  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  // The mobile drawer is never collapsed
  const collapsed = !isMobile && collapsedState;

  let navItems = PATIENT_NAV;
  if (user?.role === "admin") navItems = ADMIN_NAV;
  else if (user?.role === "doctor") navItems = DOCTOR_NAV;

  const initials =
    `${(user?.firstName || "").charAt(0)}${(user?.lastName || "").charAt(0)}`.toUpperCase();

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "doctor"
        ? "Doctor"
        : "Patient";

  const onNavigate = isMobile ? onClose : undefined;
  const ringColor = isDark ? "border-[#0F172A]" : "border-white";
  const sectionLabel = `text-[10px] font-bold uppercase tracking-widest ${
    isDark ? "text-slate-600" : "text-slate-400"
  }`;
  const divider = isDark ? "border-slate-800" : "border-slate-100";

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isMobile
            ? `fixed top-0 left-0 w-[270px] ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : `relative ${collapsed ? "w-[82px]" : "w-[270px]"}`
        } h-screen z-50 flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isDark
            ? "bg-[#0F172A] border-r border-slate-800"
            : "bg-white border-r border-slate-200"
        }`}
      >
        {/* ---------- Logo ---------- */}
        <div
          className={`h-[78px] flex-shrink-0 flex items-center px-4 border-b ${divider} ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#3B82F6] flex items-center justify-center shadow-md">
                <Heart size={20} className="text-white" fill="currentColor" />
              </div>
              <span
                className={`absolute -right-1 -top-1 w-3 h-3 rounded-full bg-[#16A34A] border-2 ${ringColor}`}
              />
            </div>

            {!collapsed && (
              <div className="animate-fade-in">
                <h1
                  className={`text-[17px] font-bold tracking-tight ${isDark ? "text-white" : "text-[#1E3A5F]"}`}
                >
                  SHMS
                </h1>
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}
                >
                  Smart Healthcare
                </p>
              </div>
            )}
          </div>

          {isMobile ? (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              }`}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          ) : (
            !collapsed && (
              <button
                onClick={() => setCollapsedState(true)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? "text-slate-500 hover:bg-slate-800 hover:text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
                title="Collapse sidebar"
              >
                <ChevronLeft size={17} />
              </button>
            )
          )}
        </div>

        {/* Expand button (only when collapsed) */}
        {collapsed && (
          <button
            onClick={() => setCollapsedState(false)}
            className={`mx-auto mt-3 p-2 rounded-lg transition-colors ${
              isDark
                ? "text-slate-500 hover:bg-slate-800 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
            title="Expand sidebar"
          >
            <ChevronRight size={17} />
          </button>
        )}

        {/* ---------- User ---------- */}
        <div className="px-4 pt-4 pb-3">
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span
                className={`absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 ${ringColor}`}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <p
                  className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  {user?.role === "doctor" ? "Dr. " : ""}
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {roleLabel}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] text-green-600 font-medium">
                    Online
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Navigation ---------- */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {!collapsed && (
            <div className="px-6 pb-2 pt-2">
              <p className={sectionLabel}>Main Menu</p>
            </div>
          )}

          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              isDark={isDark}
              onNavigate={onNavigate}
            />
          ))}

          <div className={`mt-4 pt-4 border-t ${divider}`}>
            {!collapsed && (
              <div className="px-6 pb-2">
                <p className={sectionLabel}>General</p>
              </div>
            )}

            {SHARED_NAV.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                isDark={isDark}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </nav>

        {/* ---------- System status ---------- */}
        {!collapsed && (
          <div className="px-4 pb-3 animate-fade-in">
            <div
              className={`p-3 rounded-xl border ${
                isDark
                  ? "bg-blue-500/5 border-blue-500/10"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Sparkles size={14} className="text-blue-500" />
                </div>
                <div>
                  <p
                    className={`text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    System Status
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-green-600 font-medium">
                      All systems operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Logout ---------- */}
        <div className={`p-3 border-t flex-shrink-0 ${divider}`}>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`group flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            } w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 transition-all duration-200 ${
              isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"
            }`}
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                isDark ? "group-hover:bg-red-500/10" : "group-hover:bg-red-100"
              }`}
            >
              <LogOut size={18} />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
