import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorService, appointmentService, reviewService } from '../../services/services';
import StatsCard from '../../components/ui/StatsCard';
import { StatsSkeleton } from '../../components/ui/LoadingSkeleton';
import { Calendar, Users, CheckCircle, Clock, ArrowRight, Star, MessageSquare } from 'lucide-react';
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

  const { data: profile } = useQuery({
    queryKey: ['doctor-profile-me'],
    queryFn: () => doctorService.getMyProfile().then(r => r.data.data)
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['doctor-dashboard'],
    queryFn: () => doctorService.getDashboard().then(r => r.data.data)
  });

  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ['doctor-appointments-today'],
    queryFn: () => appointmentService.getMyAppointments({ limit: 8 }).then(r => r.data)
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['doctor-reviews-recent', profile?.id],
    queryFn: () => reviewService.getByDoctor(profile?.id, { page: 1, limit: 3 }).then(r => r.data),
    enabled: !!profile?.id
  });

  const recentReviews = reviewsData?.data || [];

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

      {/* Today's Schedule & Rating Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
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

        {/* Recent Patient Reviews Side Panel */}
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Patient Feedback</h3>
            {Number(profile?.total_reviews) > 0 ? (
              <span className="flex items-center gap-1 text-xs bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1 rounded-full text-yellow-700 dark:text-yellow-400 font-bold">
                <Star size={12} className="fill-yellow-500 text-yellow-500" />
                {Number(profile?.rating).toFixed(1)} ({profile?.total_reviews})
              </span>
            ) : (
              <span className="text-xs text-slate-400">No reviews</span>
            )}
          </div>

          {recentReviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No recent reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map(rev => (
                <div key={rev.id} className={`p-3 rounded-xl border text-xs ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 dark:text-gray-200">{rev.patient_name}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11} className={s <= rev.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-gray-600"} />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-slate-500 dark:text-gray-400 italic line-clamp-2">"{rev.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
