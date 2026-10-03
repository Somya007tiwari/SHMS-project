import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";
import SkipLink from "../components/ui/SkipLink";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Users, UserCheck } from "lucide-react";

const PAGE_TITLES = {
  "/admin/dashboard": "Admin Dashboard",
  "/admin/analytics": "Advanced Hospital Analytics",
  "/admin/doctors": "Manage Doctors",
  "/admin/patients": "Manage Patients",
  "/admin/departments": "Departments",
  "/admin/appointments": "All Appointments",
  "/admin/billing": "Billing & Invoices",
  "/admin/logs": "Activity Logs",
  "/admin/settings": "System Settings",
  "/doctor/dashboard": "Doctor Dashboard",
  "/doctor/appointments": "My Appointments",
  "/doctor/patients": "My Patients",
  "/doctor/prescriptions": "Prescriptions",
  "/doctor/reports": "Medical Reports",
  "/doctor/schedule": "My Schedule",
  "/doctor/leaves": "Unavailability & Leaves",
  "/doctor/billing": "Appointment Invoices",
  "/patient/dashboard": "Patient Dashboard",
  "/patient/book-appointment": "Book Appointment",
  "/patient/appointments": "My Appointments",
  "/patient/medical-records": "Medical Records",
  "/patient/prescriptions": "My Prescriptions",
  "/patient/lab-tests": "Lab Tests & Reports",
  "/patient/reports": "Medical Reports",
  "/patient/billing": "My Bills",
  "/patient/family": "My Family & Dependents",
  "/notifications": "Notifications",
  "/ai-assistant": "AI Health Assistant",
  "/profile": "Profile Settings",
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || "SHMS";

  const actingId = sessionStorage.getItem("actingPatientId");
  const actingName = sessionStorage.getItem("actingPatientName");

  const handleSwitchBack = () => {
    sessionStorage.removeItem("actingPatientId");
    sessionStorage.removeItem("actingPatientName");
    qc.clear();
    window.location.reload();
  };

  return (
    <div
      className={`flex h-screen overflow-hidden ${isDark ? "bg-gray-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <SkipLink targetId="main-content" />

      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar isOpen={true} />
      </div>

      {/* Mobile sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={true}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header onMenuToggle={() => setSidebarOpen(true)} title={pageTitle} />
        {user?.role === "patient" && actingId && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md text-xs sm:text-sm font-semibold z-20 shrink-0">
            <div className="flex items-center gap-2">
              <Users size={18} className="animate-pulse" />
              <span>
                You are currently managing <strong>{actingName || "Dependent"}</strong>'s profile
              </span>
            </div>
            <button
              onClick={handleSwitchBack}
              className="px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors shadow-sm flex items-center gap-1 shrink-0"
            >
              <UserCheck size={14} />
              Switch back to Me
            </button>
          </div>
        )}
        <main id="main-content" tabIndex="-1" className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 focus:outline-none">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <BottomNav onOpenMore={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
};

export default DashboardLayout;
