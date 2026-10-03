import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import BookAppointment from './pages/patient/BookAppointment';

// Shared Pages
import AppointmentManagement from './pages/shared/AppointmentManagement';
import AIAssistant from './pages/shared/AIAssistant';

// Lazy placeholder pages
import { Suspense, lazy } from 'react';
const AdminDoctors = lazy(() => import('./pages/admin/AdminDoctors'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminPatients = lazy(() => import('./pages/admin/AdminPatients'));
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'));
const AdminBilling = lazy(() => import('./pages/admin/AdminBilling'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const DoctorSchedule = lazy(() => import('./pages/doctor/DoctorSchedule'));
const DoctorLeaves = lazy(() => import('./pages/doctor/DoctorLeaves'));
const DoctorBilling = lazy(() => import('./pages/doctor/DoctorBilling'));
const DoctorPatients = lazy(() => import('./pages/doctor/DoctorPatients'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/DoctorPrescriptions'));
const PatientPrescriptions = lazy(() => import('./pages/patient/PatientPrescriptions'));
const PatientReports = lazy(() => import('./pages/patient/PatientReports'));
const PatientBilling = lazy(() => import('./pages/patient/PatientBilling'));
const AdminMedicalRecords = lazy(() => import('./pages/admin/AdminMedicalRecords'));
const PatientMedicalRecords = lazy(() => import('./pages/patient/PatientMedicalRecords'));
const AdminPrescriptions = lazy(() => import('./pages/admin/AdminPrescriptions'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const Notifications = lazy(() => import('./pages/shared/Notifications'));
const DoctorProfile = lazy(() => import('./pages/shared/DoctorProfile'));
const AdminLabTests = lazy(() => import('./pages/admin/AdminLabTests'));
const AdminLabOrders = lazy(() => import('./pages/admin/AdminLabOrders'));
const DoctorLabOrders = lazy(() => import('./pages/doctor/DoctorLabOrders'));
const PatientLabTests = lazy(() => import('./pages/patient/PatientLabTests'));
const PatientAIAssistant = lazy(() => import('./pages/patient/PatientAIAssistant'));
const PublicVerifyPrescription = lazy(() => import('./pages/PublicVerifyPrescription'));
const PublicSharedPrescription = lazy(() => import('./pages/PublicSharedPrescription'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false
    }
  }
});

// Route Guards
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
};

// Fallback page for lazy-loaded pages
const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Simple placeholder for admin pages not yet implemented
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
      <span className="text-white text-2xl">🚧</span>
    </div>
    <h2 className="text-xl font-bold text-slate-700 dark:text-gray-300">{title}</h2>
    <p className="text-slate-400 text-sm">This page is fully implemented in the backend. UI coming soon.</p>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' }
              }}
            />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

                {/* Public Verification and Share Routes */}
                <Route path="/verify/:code" element={<PublicVerifyPrescription />} />
                <Route path="/prescriptions/shared/:token" element={<PublicSharedPrescription />} />

                {/* Public Doctor Profile */}
                <Route path="/doctors/:id" element={<DoctorProfile />} />

                {/* Dashboard */}
                <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  {/* Admin */}
                  <Route path="admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
                  <Route path="admin/doctors" element={<ProtectedRoute roles={['admin']}><AdminDoctors /></ProtectedRoute>} />
                  <Route path="admin/patients" element={<ProtectedRoute roles={['admin']}><AdminPatients /></ProtectedRoute>} />
                  <Route path="admin/departments" element={<ProtectedRoute roles={['admin']}><AdminDepartments /></ProtectedRoute>} />
                  <Route path="admin/appointments" element={<ProtectedRoute roles={['admin']}><AppointmentManagement /></ProtectedRoute>} />
                  <Route path="admin/medical-records" element={<ProtectedRoute roles={['admin']}><AdminMedicalRecords /></ProtectedRoute>} />
                  <Route path="admin/prescriptions" element={<ProtectedRoute roles={['admin']}><AdminPrescriptions /></ProtectedRoute>} />
                  <Route path="admin/billing" element={<ProtectedRoute roles={['admin']}><AdminBilling /></ProtectedRoute>} />
                  <Route path="admin/lab-tests" element={<ProtectedRoute roles={['admin']}><AdminLabTests /></ProtectedRoute>} />
                  <Route path="admin/lab-orders" element={<ProtectedRoute roles={['admin']}><AdminLabOrders /></ProtectedRoute>} />
                  <Route path="admin/logs" element={<ProtectedRoute roles={['admin']}><AdminLogs /></ProtectedRoute>} />
                  <Route path="admin/security" element={<ProtectedRoute roles={['admin']}><AdminSecurity /></ProtectedRoute>} />
                  <Route path="admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />

                  {/* Doctor */}
                  <Route path="doctor/dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
                  <Route path="doctor/appointments" element={<ProtectedRoute roles={['doctor']}><AppointmentManagement /></ProtectedRoute>} />
                  <Route path="doctor/patients" element={<ProtectedRoute roles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
                  <Route path="doctor/prescriptions" element={<ProtectedRoute roles={['doctor']}><DoctorPrescriptions /></ProtectedRoute>} />
                  <Route path="doctor/lab-orders" element={<ProtectedRoute roles={['doctor']}><DoctorLabOrders /></ProtectedRoute>} />
                  <Route path="doctor/reports" element={<ProtectedRoute roles={['doctor']}><ComingSoon title="Medical Reports" /></ProtectedRoute>} />
                  <Route path="doctor/schedule" element={<ProtectedRoute roles={['doctor']}><DoctorSchedule /></ProtectedRoute>} />
                  <Route path="doctor/leaves" element={<ProtectedRoute roles={['doctor']}><DoctorLeaves /></ProtectedRoute>} />
                  <Route path="doctor/billing" element={<ProtectedRoute roles={['doctor']}><DoctorBilling /></ProtectedRoute>} />

                  {/* Patient */}
                  <Route path="patient/dashboard" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
                  <Route path="patient/book-appointment" element={<ProtectedRoute roles={['patient']}><BookAppointment /></ProtectedRoute>} />
                  <Route path="patient/doctors/:id" element={<ProtectedRoute roles={['patient']}><DoctorProfile /></ProtectedRoute>} />
                  <Route path="patient/appointments" element={<ProtectedRoute roles={['patient']}><AppointmentManagement /></ProtectedRoute>} />
                  <Route path="patient/medical-records" element={<ProtectedRoute roles={['patient']}><PatientMedicalRecords /></ProtectedRoute>} />
                  <Route path="patient/prescriptions" element={<ProtectedRoute roles={['patient']}><PatientPrescriptions /></ProtectedRoute>} />
                  <Route path="patient/lab-tests" element={<ProtectedRoute roles={['patient']}><PatientLabTests /></ProtectedRoute>} />
                  <Route path="patient/reports" element={<ProtectedRoute roles={['patient']}><PatientReports /></ProtectedRoute>} />
                  <Route path="patient/billing" element={<ProtectedRoute roles={['patient']}><PatientBilling /></ProtectedRoute>} />
                  <Route path="patient/ai-assistant" element={<ProtectedRoute roles={['patient']}><PatientAIAssistant /></ProtectedRoute>} />

                  {/* Shared */}
                  <Route path="doctors/:id" element={<DoctorProfile />} />
                  <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="ai-assistant" element={<ProtectedRoute><PatientAIAssistant /></ProtectedRoute>} />
                  <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                </Route>

                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <h1 className="text-6xl font-black text-blue-600">404</h1>
                      <p className="text-slate-500 mt-2">Page not found</p>
                      <a href="/login" className="btn-primary px-6 py-2.5 text-sm mt-4 inline-flex">Go Home</a>
                    </div>
                  </div>
                } />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;