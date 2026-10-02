import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/services';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  Building2,
  Download,
  RotateCcw,
  Star,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  completed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  rejected: '#64748b',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

export default function AdminAnalytics() {
  const [rangePreset, setRangePreset] = useState('30d');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [exportReport, setExportReport] = useState('overview');

  // Handle Preset Changes
  const handlePresetChange = (preset) => {
    setRangePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  const params = {
    from: fromDate || undefined,
    to: toDate || undefined,
    groupBy,
  };

  // Queries
  const overviewQuery = useQuery({
    queryKey: ['analytics-overview', params.from, params.to],
    queryFn: async () => (await analyticsService.getOverview(params)).data?.data,
    placeholderData: (prev) => prev,
  });

  const apptTrendQuery = useQuery({
    queryKey: ['analytics-appt-trend', params.from, params.to, params.groupBy],
    queryFn: async () => (await analyticsService.getAppointmentsTrend(params)).data?.data,
    placeholderData: (prev) => prev,
  });

  const revTrendQuery = useQuery({
    queryKey: ['analytics-rev-trend', params.from, params.to, params.groupBy],
    queryFn: async () => (await analyticsService.getRevenueTrend(params)).data?.data,
    placeholderData: (prev) => prev,
  });

  const growthQuery = useQuery({
    queryKey: ['analytics-growth', params.from, params.to, params.groupBy],
    queryFn: async () => (await analyticsService.getPatientGrowth(params)).data?.data,
    placeholderData: (prev) => prev,
  });

  const deptQuery = useQuery({
    queryKey: ['analytics-depts', params.from, params.to],
    queryFn: async () => (await analyticsService.getDepartmentsAnalytics(params)).data?.data,
    placeholderData: (prev) => prev,
  });

  const doctorQuery = useQuery({
    queryKey: ['analytics-doctors', params.from, params.to],
    queryFn: async () => (await analyticsService.getDoctorsAnalytics({ ...params, limit: 10 })).data?.data,
    placeholderData: (prev) => prev,
  });

  const isError = overviewQuery.isError || apptTrendQuery.isError;
  const isLoading = overviewQuery.isLoading && !overviewQuery.data;

  const handleExportCSV = async () => {
    const toastId = toast.loading(`Exporting ${exportReport} report...`);
    try {
      const res = await analyticsService.exportCSV({
        report: exportReport,
        from: fromDate || undefined,
        to: toDate || undefined,
        groupBy,
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${exportReport}-${fromDate || '30d'}-to-${toDate || 'today'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to export CSV', { id: toastId });
    }
  };

  const handleRetryAll = () => {
    overviewQuery.refetch();
    apptTrendQuery.refetch();
    revTrendQuery.refetch();
    growthQuery.refetch();
    deptQuery.refetch();
    doctorQuery.refetch();
  };

  const metrics = overviewQuery.data?.metrics || {};

  // Pie chart data for appointment status
  const pieData = [
    { name: 'Completed', value: metrics.completed?.current || 0, color: STATUS_COLORS.completed },
    { name: 'Pending', value: metrics.pending?.current || 0, color: STATUS_COLORS.pending },
    { name: 'Cancelled', value: metrics.cancelled?.current || 0, color: STATUS_COLORS.cancelled },
    { name: 'Rejected', value: metrics.rejected?.current || 0, color: STATUS_COLORS.rejected },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-600 dark:text-blue-400" />
            Advanced Hospital Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Real-time operational insights, appointment trends, revenue performance, and doctor stats.
          </p>
        </div>

        {/* Export CSV Control */}
        <div className="flex items-center gap-2">
          <select
            value={exportReport}
            onChange={(e) => setExportReport(e.target.value)}
            className="input-field py-1.5 px-3 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="overview">Overview Report</option>
            <option value="appointments">Appointments Trend</option>
            <option value="revenue">Revenue Trend</option>
            <option value="departments">Department Performance</option>
            <option value="doctors">Doctor Performance</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Control Bar: Presets & Date Filters */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 mr-1">Time Range:</span>
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handlePresetChange(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                rangePreset === btn.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers & GroupBy */}
        <div className="flex flex-wrap items-center gap-3">
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field py-1 px-2 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field py-1 px-2 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-gray-800 pl-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Group By:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="input-field py-1 px-2 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {isError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertTriangle size={20} />
            <span>Failed to load some analytics metrics. Please check your backend connection.</span>
          </div>
          <button
            onClick={handleRetryAll}
            className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 text-rose-700 dark:text-rose-300"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Patients */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Patients</span>
            <Users size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {metrics.totalPatients?.current || 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            +{metrics.newPatients?.current || 0} new in range
          </p>
        </div>

        {/* Active Doctors */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Doctors</span>
            <Stethoscope size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {metrics.totalDoctors?.current || 0}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {metrics.totalDoctors?.active || 0} currently active
          </p>
        </div>

        {/* Total Appointments */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Appointments</span>
            <Calendar size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {metrics.appointments?.current || 0}
          </p>
          <div className="flex items-center gap-1 text-xs mt-1">
            {(metrics.appointments?.percentChange || 0) >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingUp size={12} className="mr-0.5" />+{metrics.appointments?.percentChange}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingDown size={12} className="mr-0.5" />{metrics.appointments?.percentChange}%
              </span>
            )}
            <span className="text-slate-400">vs prev</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
            <CreditCard size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            ₹{parseFloat(metrics.revenue?.current || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1 text-xs mt-1">
            {(metrics.revenue?.percentChange || 0) >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingUp size={12} className="mr-0.5" />+{metrics.revenue?.percentChange}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingDown size={12} className="mr-0.5" />{metrics.revenue?.percentChange}%
              </span>
            )}
            <span className="text-slate-400">vs prev</span>
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cancel Rate</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {metrics.cancellationRate?.current || 0}%
          </p>
          <div className="flex items-center gap-1 text-xs mt-1">
            {(metrics.cancellationRate?.percentChange || 0) <= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingDown size={12} className="mr-0.5" />{metrics.cancellationRate?.percentChange}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingUp size={12} className="mr-0.5" />+{metrics.cancellationRate?.percentChange}%
              </span>
            )}
            <span className="text-slate-400">vs prev</span>
          </div>
        </div>

        {/* Pending Bills */}
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Bills</span>
            <CreditCard size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            ₹{parseFloat(metrics.pendingInvoiceAmount?.current || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Uncollected invoices</p>
        </div>
      </div>

      {/* Main Charts Row 1: Appointments Trend & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Area Chart */}
        <div className="lg:col-span-2 card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" /> Appointment Velocity & Status Breakdown
            </h3>
            <span className="text-xs text-slate-400">GroupBy: {groupBy.toUpperCase()}</span>
          </div>

          <div className="h-72 w-full">
            {apptTrendQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Loading trend chart...</div>
            ) : (apptTrendQuery.data || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No appointment data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apptTrendQuery.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="total" name="Total Appointments" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" fill={false} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Appointment Status Pie Chart */}
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-base">Status Distribution</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <span className="text-xs text-slate-400">No appointments recorded</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Revenue Trend & Patient Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Bar Chart */}
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-500" /> Revenue Growth Trend (₹)
          </h3>
          <div className="h-64 w-full">
            {revTrendQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Loading revenue chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revTrendQuery.data || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`₹${parseFloat(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Patient Growth Cumulative Line Chart */}
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
            <Users size={18} className="text-indigo-500" /> Patient Acquisition & Cumulative Total
          </h3>
          <div className="h-64 w-full">
            {growthQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Loading growth chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthQuery.data || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="cumulative_patients" name="Cumulative Patients" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="new_patients" name="New Registrations" stroke="#ec4899" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Department Performance & Top Doctors Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Horizontal Bar Chart */}
        <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
            <Building2 size={18} className="text-amber-500" /> Top Departments
          </h3>
          <div className="h-72 w-full">
            {deptQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Loading department stats...</div>
            ) : (deptQuery.data || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No department data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={deptQuery.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="department_name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="appointment_count" name="Appointments" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 10 Doctors Performance Table */}
        <div className="lg:col-span-2 card p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
            <Stethoscope size={18} className="text-blue-500" /> Top 10 Active Doctors
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Doctor</th>
                  <th className="py-2.5 px-3 font-semibold">Specialization</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Appts</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Completed</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Cancel Rate</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Revenue</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {(doctorQuery.data || []).map((doc) => (
                  <tr key={doc.doctor_id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-white">
                      Dr. {doc.doctor_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-gray-400">
                      {doc.specialization}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-gray-200">
                      {doc.appointment_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {doc.completed_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      {doc.cancellation_rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-white">
                      ₹{parseFloat(doc.revenue || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {doc.average_rating !== null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                          <Star size={12} fill="currentColor" /> {doc.average_rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
