import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useTheme } from '../context/ThemeContext';

const PAGE_TITLES = {
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/doctors': 'Manage Doctors',
  '/admin/patients': 'Manage Patients',
  '/admin/departments': 'Departments',
  '/admin/appointments': 'All Appointments',
  '/admin/billing': 'Billing & Invoices',
  '/admin/logs': 'Activity Logs',
  '/admin/settings': 'System Settings',
  '/doctor/dashboard': 'Doctor Dashboard',
  '/doctor/appointments': 'My Appointments',
  '/doctor/patients': 'My Patients',
  '/doctor/prescriptions': 'Prescriptions',
  '/doctor/reports': 'Medical Reports',
  '/doctor/schedule': 'My Schedule',
  '/patient/dashboard': 'Patient Dashboard',
  '/patient/book-appointment': 'Book Appointment',
  '/patient/appointments': 'My Appointments',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/reports': 'Medical Reports',
  '/patient/billing': 'My Bills',
  '/notifications': 'Notifications',
  '/ai-assistant': 'AI Health Assistant',
  '/profile': 'Profile Settings',
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark } = useTheme();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'SHMS';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar isOpen={true} />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(true)}
          title={pageTitle}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
