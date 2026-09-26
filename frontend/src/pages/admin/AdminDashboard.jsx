import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/services';
import StatsCard from '../../components/ui/StatsCard';
import { StatsSkeleton } from '../../components/ui/LoadingSkeleton';
import { Users, Stethoscope, Calendar, DollarSign, Activity, TrendingUp, Building2, Clock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const DEPT_COLORS = ['#1a73e8', '#00bcd4', '#7c3aed', '#00c853', '#ff6b35', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`px-4 py-3 rounded-xl shadow-xl border text-sm
        ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name}: <strong>{typeof p.value === 'number' && p.name.includes('Revenue') ? `₹${p.value.toLocaleString()}` : p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { isDark } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard().then(r => r.data.data),
    refetchInterval: 60000
  });

  const axisStyle = { fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-xl text-sm font-medium">
          <Activity size={14} />
          System Online
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Patients"
            value={parseInt(data?.users?.total_patients || 0).toLocaleString()}
            subtitle={`+${data?.users?.new_users_30d || 0} new this month`}
            icon={Users} color="blue"
          />
          <StatsCard
            title="Total Doctors"
            value={parseInt(data?.users?.total_doctors || 0).toLocaleString()}
            icon={Stethoscope} color="teal"
          />
          <StatsCard
            title="Total Appointments"
            value={parseInt(data?.appointments?.total_appointments || 0).toLocaleString()}
            subtitle={`${data?.appointments?.today || 0} today`}
            icon={Calendar} color="purple"
          />
          <StatsCard
            title="Total Revenue"
            value={`₹${parseFloat(data?.revenue?.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`₹${parseFloat(data?.revenue?.revenue_30d || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month`}
            icon={DollarSign} color="green"
          />
        </div>
      )}

      {/* Appointment Status Row */}
      {!isLoading && data?.appointments && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: data.appointments.pending, color: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
            { label: 'Approved', value: data.appointments.approved, color: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
            { label: 'Completed', value: data.appointments.completed, color: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
            { label: 'Cancelled', value: data.appointments.cancelled, color: 'bg-slate-100 dark:bg-gray-800', text: 'text-slate-600 dark:text-gray-400' },
          ].map(item => (
            <div key={item.label} className={`card p-4 ${item.color}`}>
              <p className={`text-2xl font-bold ${item.text}`}>{item.value || 0}</p>
              <p className={`text-xs mt-1 ${item.text} opacity-80`}>{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Appointment Trends</h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          {isLoading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.monthlyTrends || []}>
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#1a73e8" fill="url(#colorAppointments)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#00c853" fill="none" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trends */}
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Revenue Trends</h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          {isLoading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.revenueTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#1a73e8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Department Statistics */}
      {!isLoading && data?.departments && (
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Department Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {data.departments.slice(0, 6).map((dept, i) => (
                <div key={dept.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDark ? 'text-gray-300' : 'text-slate-700'}>{dept.name}</span>
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{dept.appointment_count}</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, (dept.appointment_count / (data.departments[0]?.appointment_count || 1)) * 100)}%`,
                          backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.departments.slice(0, 6).map(d => ({ name: d.name, value: parseInt(d.appointment_count) || 0 }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {data.departments.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
