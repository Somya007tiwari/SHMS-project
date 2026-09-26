import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../../services/services';
import StatsCard from '../../components/ui/StatsCard';
import { StatsSkeleton } from '../../components/ui/LoadingSkeleton';
import { Calendar, FileText, Pill, Bell, ArrowRight, Clock } from 'lucide-react';
import { appointmentService } from '../../services/services';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const StatusBadge = ({ status }) => {
  const classes = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  };
  return <span className={`badge ${classes[status] || 'badge-pending'}`}>{status}</span>;
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['patient-dashboard'],
    queryFn: () => patientService.getDashboard().then(r => r.data.data)
  });

  const { data: appointmentsData, isLoading: apptLoading } = useQuery({
    queryKey: ['my-appointments', { limit: 5 }],
    queryFn: () => appointmentService.getMyAppointments({ limit: 5 }).then(r => r.data)
  });

  const upcomingAppointments = appointmentsData?.data?.filter(a =>
    ['pending', 'approved'].includes(a.status) && new Date(a.appointment_date) >= new Date()
  ) || [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className={`rounded-2xl p-6 gradient-primary text-white relative overflow-hidden`}>
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <div className="w-64 h-64 rounded-full border-4 border-white absolute -right-12 -top-12" />
          <div className="w-32 h-32 rounded-full border-2 border-white absolute right-24 bottom-0" />
        </div>
        <p className="text-sm opacity-80 mb-1">Welcome back 👋</p>
        <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
        <p className="text-sm opacity-70 mt-2">Take care of your health. Book your appointment today.</p>
        <Link
          to="/patient/book-appointment"
          className="inline-flex items-center gap-2 mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          Book Appointment <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stats */}
      {statsLoading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Upcoming"
            value={stats?.upcoming_appointments || 0}
            icon={Calendar} color="blue"
            subtitle="appointments"
          />
          <StatsCard
            title="Completed"
            value={stats?.completed_appointments || 0}
            icon={Clock} color="green"
            subtitle="consultations"
          />
          <StatsCard
            title="Prescriptions"
            value={stats?.total_prescriptions || 0}
            icon={Pill} color="purple"
          />
          <StatsCard
            title="Medical Records"
            value={stats?.total_records || 0}
            icon={FileText} color="teal"
          />
        </div>
      )}

      {/* Recent Appointments */}
      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Upcoming Appointments</h3>
          <Link to="/patient/appointments" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {apptLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No upcoming appointments</p>
            <Link to="/patient/book-appointment"
              className="inline-block mt-4 text-blue-600 text-sm font-medium hover:underline">
              Book your first appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 5).map(appt => (
              <div key={appt.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm
                  ${isDark ? 'border-gray-700 hover:border-blue-500/50' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {appt.doctor_name?.split(' ').slice(-1)[0]?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    Dr. {appt.doctor_name}
                  </p>
                  <p className="text-xs text-slate-400">{appt.specialization}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                    {new Date(appt.appointment_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">{String(appt.appointment_time).substring(0, 5)}</p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/patient/book-appointment', icon: Calendar, label: 'Book Appointment', color: 'from-blue-500 to-blue-700' },
          { to: '/patient/prescriptions', icon: Pill, label: 'My Prescriptions', color: 'from-purple-500 to-purple-700' },
          { to: '/patient/reports', icon: FileText, label: 'Medical Reports', color: 'from-teal-500 to-teal-700' },
          { to: '/ai-assistant', icon: Bell, label: 'AI Health Chat', color: 'from-green-500 to-green-700' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={`card card-hover p-5 flex flex-col items-center gap-3 text-center ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <Icon size={22} className="text-white" />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default PatientDashboard;
