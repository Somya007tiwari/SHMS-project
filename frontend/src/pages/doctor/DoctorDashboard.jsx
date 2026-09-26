import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorService, appointmentService } from '../../services/services';
import StatsCard from '../../components/ui/StatsCard';
import { StatsSkeleton } from '../../components/ui/LoadingSkeleton';
import { Calendar, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const StatusBadge = ({ status }) => {
  const classes = {
    pending: 'badge-pending', approved: 'badge-approved',
    rejected: 'badge-rejected', completed: 'badge-completed', cancelled: 'badge-cancelled'
  };
  return <span className={`badge ${classes[status] || 'badge-pending'} capitalize`}>{status}</span>;
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['doctor-dashboard'],
    queryFn: () => doctorService.getDashboard().then(r => r.data.data)
  });

  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ['doctor-appointments-today'],
    queryFn: () => appointmentService.getMyAppointments({ limit: 8 }).then(r => r.data)
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className={`rounded-2xl p-6 gradient-primary text-white relative overflow-hidden`}>
        <div className="absolute right-0 top-0 w-48 h-full opacity-10">
          <div className="w-48 h-48 rounded-full border-4 border-white absolute -right-8 -top-8" />
        </div>
        <p className="text-sm opacity-80">Good day, Doctor 👨‍⚕️</p>
        <h2 className="text-2xl font-bold mt-1">Dr. {user?.firstName} {user?.lastName}</h2>
        <p className="text-sm opacity-70 mt-2">Manage your appointments and patient care.</p>
      </div>

      {/* Stats */}
      {statsLoading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Today's Appointments" value={stats?.today_appointments || 0} icon={Calendar} color="blue" />
          <StatsCard title="Pending Requests" value={stats?.pending_requests || 0} icon={Clock} color="orange" />
          <StatsCard title="Completed" value={stats?.completed_consultations || 0} icon={CheckCircle} color="green" />
          <StatsCard title="Total Patients" value={stats?.total_patients || 0} icon={Users} color="purple" />
        </div>
      )}

      {/* Today's Schedule */}
      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Today's Schedule</h3>
          <Link to="/doctor/appointments" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            Manage all <ArrowRight size={14} />
          </Link>
        </div>

        {apptLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : (apptData?.data || []).length === 0 ? (
          <div className="text-center py-10">
            <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No appointments today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(apptData?.data || []).map(appt => (
              <div key={appt.id}
                className={`flex items-center gap-4 p-4 rounded-xl border
                  ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {appt.patient_name?.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{appt.patient_name}</p>
                  <p className="text-xs text-slate-400">{appt.reason || 'General consultation'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                    {String(appt.appointment_time).substring(0, 5)}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
