import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/services";
import StatsCard from "../../components/ui/StatsCard";
import { StatsSkeleton } from "../../components/ui/LoadingSkeleton";

import {
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  Activity,
  UserPlus,
  CalendarPlus,
  Building2,
  FileText,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useTheme } from "../../context/ThemeContext";

const CHART_COLORS = [
  "#3B82F6",
  "#7C3AED",
  "#1E3A5F",
  "#16A34A",
  "#F59E0B",
  "#EC4899",
];

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      className={
        "px-4 py-3 rounded-xl shadow-xl border text-sm " +
        (isDark
          ? "bg-[#111827] border-slate-700 text-white"
          : "bg-white border-slate-200 text-slate-800")
      }
    >
      {" "}
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((item, index) => (
        <p
          key={index}
          className="text-xs flex items-center gap-2 mb-1 last:mb-0"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />

          <span>{item.name}:</span>

          <strong>
            {item.name && item.name.includes("Revenue")
              ? "₹" + Number(item.value || 0).toLocaleString("en-IN")
              : item.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const { isDark } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () =>
      adminService.getDashboard().then((response) => response.data.data),
    refetchInterval: 60000,
  });

  const axisStyle = {
    fill: isDark ? "#94A3B8" : "#64748B",
    fontSize: 11,
  };

  const totalPatients = parseInt(data?.users?.total_patients || 0);
  const totalDoctors = parseInt(data?.users?.total_doctors || 0);
  const totalAppointments = parseInt(
    data?.appointments?.total_appointments || 0,
  );
  const totalRevenue = parseFloat(data?.revenue?.total_revenue || 0);

  const newPatients = parseInt(data?.users?.new_users_30d || 0);
  const todayAppointments = parseInt(data?.appointments?.today || 0);

  const formatRevenue = (value) => {
    return (
      "₹" +
      parseFloat(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })
    );
  };

  const appointmentStatuses = [
    {
      label: "Pending",
      value: data?.appointments?.pending || 0,
      icon: Clock3,
      iconClass: "text-orange-500",
      bgClass: isDark
        ? "bg-orange-500/10 border-orange-500/20"
        : "bg-orange-50 border-orange-100",
      valueClass: isDark ? "text-orange-400" : "text-orange-600",
    },
    {
      label: "Approved",
      value: data?.appointments?.approved || 0,
      icon: CheckCircle2,
      iconClass: "text-blue-500",
      bgClass: isDark
        ? "bg-blue-500/10 border-blue-500/20"
        : "bg-blue-50 border-blue-100",
      valueClass: isDark ? "text-blue-400" : "text-blue-600",
    },
    {
      label: "Completed",
      value: data?.appointments?.completed || 0,
      icon: CheckCircle2,
      iconClass: "text-green-500",
      bgClass: isDark
        ? "bg-green-500/10 border-green-500/20"
        : "bg-green-50 border-green-100",
      valueClass: isDark ? "text-green-400" : "text-green-600",
    },
    {
      label: "Cancelled",
      value: data?.appointments?.cancelled || 0,
      icon: XCircle,
      iconClass: "text-slate-500",
      bgClass: isDark
        ? "bg-slate-800 border-slate-700"
        : "bg-slate-50 border-slate-200",
      valueClass: isDark ? "text-slate-200" : "text-slate-700",
    },
  ];

  const quickActions = [
    {
      title: "Manage Doctors",
      description: "View and manage doctors",
      icon: Stethoscope,
      path: "/admin/doctors",
      iconBg: isDark
        ? "bg-blue-500/10 text-blue-400"
        : "bg-blue-50 text-blue-600",
    },
    {
      title: "Manage Patients",
      description: "View registered patients",
      icon: Users,
      path: "/admin/patients",
      iconBg: isDark
        ? "bg-purple-500/10 text-purple-400"
        : "bg-purple-50 text-purple-600",
    },
    {
      title: "Appointments",
      description: "Review appointments",
      icon: Calendar,
      path: "/admin/appointments",
      iconBg: isDark
        ? "bg-green-500/10 text-green-400"
        : "bg-green-50 text-green-600",
    },
    {
      title: "Departments",
      description: "Manage departments",
      icon: Building2,
      path: "/admin/departments",
      iconBg: isDark
        ? "bg-orange-500/10 text-orange-400"
        : "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* =========================================================
WELCOME SECTION
========================================================= */}

      <section
        className={
          "relative overflow-hidden rounded-2xl border p-5 md:p-6 " +
          (isDark
            ? "bg-gradient-to-br from-[#172554] via-[#1E3A5F] to-[#312E81] border-blue-900/40"
            : "bg-gradient-to-br from-[#EFF6FF] via-white to-[#F5F3FF] border-blue-100")
        }
      >
        {/* Decorative circles */}

        <div
          className={
            "absolute -right-10 -top-16 w-48 h-48 rounded-full blur-3xl " +
            (isDark ? "bg-blue-500/20" : "bg-blue-200/40")
          }
        />

        <div
          className={
            "absolute right-24 -bottom-20 w-40 h-40 rounded-full blur-3xl " +
            (isDark ? "bg-purple-500/20" : "bg-purple-200/30")
          }
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold " +
                  (isDark
                    ? "bg-white/10 text-blue-200"
                    : "bg-blue-100 text-blue-700")
                }
              >
                <Activity size={12} />
                Hospital Overview
              </span>
            </div>

            <h1
              className={
                "text-2xl md:text-3xl font-bold tracking-tight " +
                (isDark ? "text-white" : "text-[#0F172A]")
              }
            >
              Dashboard Overview
            </h1>

            <p
              className={
                "mt-1.5 text-sm max-w-xl " +
                (isDark ? "text-blue-100/70" : "text-slate-500")
              }
            >
              Monitor patients, doctors, appointments and hospital activity from
              one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={
                "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold " +
                (isDark
                  ? "bg-white/10 border-white/10 text-green-300"
                  : "bg-white border-green-100 text-green-700 shadow-sm")
              }
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
              </span>
              System Online
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
      STATISTICS
  ========================================================= */}

      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Patients"
            value={totalPatients.toLocaleString()}
            subtitle={
              newPatients > 0
                ? "+" + newPatients + " new this month"
                : "No new patients this month"
            }
            icon={Users}
            color="blue"
            trend={newPatients > 0}
            trendValue={newPatients > 0 ? "+" + newPatients : "0"}
          />

          <StatsCard
            title="Total Doctors"
            value={totalDoctors.toLocaleString()}
            subtitle="Registered doctors"
            icon={Stethoscope}
            color="teal"
            trend={totalDoctors > 0}
            trendValue={totalDoctors > 0 ? "Active" : "0"}
          />

          <StatsCard
            title="Appointments"
            value={totalAppointments.toLocaleString()}
            subtitle={todayAppointments + " scheduled today"}
            icon={Calendar}
            color="purple"
            trend={todayAppointments > 0}
            trendValue={
              todayAppointments > 0
                ? todayAppointments + " today"
                : "No appointments"
            }
          />

          <StatsCard
            title="Total Revenue"
            value={formatRevenue(totalRevenue)}
            subtitle={
              formatRevenue(data?.revenue?.revenue_30d || 0) + " this month"
            }
            icon={DollarSign}
            color="green"
            trend={totalRevenue > 0}
            trendValue={totalRevenue > 0 ? "Updated" : "₹0"}
          />
        </div>
      )}

      {/* =========================================================
      QUICK ACTIONS
  ========================================================= */}

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2
              className={
                "text-base font-semibold " +
                (isDark ? "text-white" : "text-slate-800")
              }
            >
              Quick Actions
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">
              Quickly access common administrative tasks
            </p>
          </div>

          <ArrowUpRight
            size={17}
            className={isDark ? "text-slate-600" : "text-slate-300"}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <a
                key={action.title}
                href={action.path}
                className={
                  "group flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md " +
                  (isDark
                    ? "bg-[#111827] border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:border-blue-200")
                }
              >
                <div
                  className={
                    "flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 " +
                    action.iconBg
                  }
                >
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={
                      "text-sm font-semibold " +
                      (isDark ? "text-white" : "text-slate-800")
                    }
                  >
                    {action.title}
                  </p>

                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {action.description}
                  </p>
                </div>

                <ArrowUpRight
                  size={16}
                  className={
                    "transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 " +
                    (isDark ? "text-slate-600" : "text-slate-300")
                  }
                />
              </a>
            );
          })}
        </div>
      </section>

      {/* =========================================================
      APPOINTMENT STATUS
  ========================================================= */}

      {!isLoading && data?.appointments && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2
                className={
                  "text-base font-semibold " +
                  (isDark ? "text-white" : "text-slate-800")
                }
              >
                Appointment Overview
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Current appointment status
              </p>
            </div>

            <div
              className={
                "hidden sm:flex items-center gap-1.5 text-xs " +
                (isDark ? "text-slate-500" : "text-slate-400")
              }
            >
              <TrendingUp size={14} />
              Live data
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {appointmentStatuses.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={
                    "group relative overflow-hidden p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm " +
                    item.bgClass
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={"text-2xl font-bold " + item.valueClass}>
                        {item.value || 0}
                      </p>

                      <p
                        className={
                          "text-xs mt-1 " +
                          (isDark ? "text-slate-500" : "text-slate-500")
                        }
                      >
                        {item.label}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-white/5 flex items-center justify-center">
                      <Icon size={17} className={item.iconClass} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================
      CHARTS
  ========================================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Appointment Trends */}

        <div
          className={
            "rounded-2xl p-5 md:p-6 border " +
            (isDark
              ? "bg-[#111827] border-slate-800"
              : "bg-white border-slate-200")
          }
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={
                    "font-semibold " +
                    (isDark ? "text-white" : "text-slate-800")
                  }
                >
                  Appointment Trends
                </h3>

                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10px] font-medium " +
                    (isDark
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-blue-50 text-blue-600")
                  }
                >
                  6 Months
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Appointments vs completed visits
              </p>
            </div>

            <div
              className={
                "w-10 h-10 flex items-center justify-center rounded-xl " +
                (isDark ? "bg-blue-500/10" : "bg-blue-50")
              }
            >
              <Calendar size={18} className="text-blue-500" />
            </div>
          </div>

          {isLoading ? (
            <div className="h-[230px] skeleton rounded-xl" />
          ) : data?.monthlyTrends?.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={data.monthlyTrends}>
                <defs>
                  <linearGradient
                    id="appointmentGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />

                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#1E293B" : "#F1F5F9"}
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />

                <Tooltip content={<CustomTooltip isDark={isDark} />} />

                <Area
                  type="monotone"
                  dataKey="appointments"
                  name="Appointments"
                  stroke="#3B82F6"
                  fill="url(#appointmentGradient)"
                  strokeWidth={2.5}
                />

                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#16A34A"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[230px] flex flex-col items-center justify-center text-center">
              <div
                className={
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 " +
                  (isDark
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400")
                }
              >
                <Calendar size={22} />
              </div>

              <p
                className={
                  "text-sm font-medium " +
                  (isDark ? "text-slate-300" : "text-slate-600")
                }
              >
                No appointment data
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Data will appear here once appointments are available.
              </p>
            </div>
          )}
        </div>

        {/* Revenue Trends */}

        <div
          className={
            "rounded-2xl p-5 md:p-6 border " +
            (isDark
              ? "bg-[#111827] border-slate-800"
              : "bg-white border-slate-200")
          }
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={
                    "font-semibold " +
                    (isDark ? "text-white" : "text-slate-800")
                  }
                >
                  Revenue Trends
                </h3>

                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10px] font-medium " +
                    (isDark
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-purple-50 text-purple-600")
                  }
                >
                  6 Months
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Monthly hospital revenue
              </p>
            </div>

            <div
              className={
                "w-10 h-10 flex items-center justify-center rounded-xl " +
                (isDark ? "bg-purple-500/10" : "bg-purple-50")
              }
            >
              <DollarSign size={18} className="text-purple-500" />
            </div>
          </div>

          {isLoading ? (
            <div className="h-[230px] skeleton rounded-xl" />
          ) : data?.revenueTrends?.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data.revenueTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#1E293B" : "#F1F5F9"}
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={axisStyle}
                  tickFormatter={(value) =>
                    "₹" + (value / 1000).toFixed(0) + "K"
                  }
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip isDark={isDark} />} />

                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#7C3AED"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[230px] flex flex-col items-center justify-center text-center">
              <div
                className={
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 " +
                  (isDark
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400")
                }
              >
                <DollarSign size={22} />
              </div>

              <p
                className={
                  "text-sm font-medium " +
                  (isDark ? "text-slate-300" : "text-slate-600")
                }
              >
                No revenue data
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Revenue trends will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
      DEPARTMENT PERFORMANCE
  ========================================================= */}

      {!isLoading && data?.departments && (
        <section
          className={
            "rounded-2xl p-5 md:p-6 border " +
            (isDark
              ? "bg-[#111827] border-slate-800"
              : "bg-white border-slate-200")
          }
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3
                className={
                  "font-semibold " + (isDark ? "text-white" : "text-slate-800")
                }
              >
                Department Performance
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Appointment distribution across departments
              </p>
            </div>

            <div
              className={
                "w-10 h-10 rounded-xl flex items-center justify-center " +
                (isDark ? "bg-[#1E3A5F]" : "bg-blue-50")
              }
            >
              <Building2 size={18} className="text-[#3B82F6]" />
            </div>
          </div>

          {data.departments.length === 0 ? (
            <div className="py-12 text-center">
              <div
                className={
                  "mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 " +
                  (isDark
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400")
                }
              >
                <Building2 size={24} />
              </div>

              <p
                className={
                  "text-sm font-semibold " +
                  (isDark ? "text-slate-300" : "text-slate-700")
                }
              >
                No departments available
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Department information will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Department List */}

              <div className="space-y-4">
                {data.departments.slice(0, 6).map((dept, index) => {
                  const maxAppointments = Math.max(
                    1,
                    ...data.departments.map((department) =>
                      Number(department.appointment_count || 0),
                    ),
                  );

                  const currentAppointments = Number(
                    dept.appointment_count || 0,
                  );

                  const percentage = Math.min(
                    100,
                    (currentAppointments / maxAppointments) * 100,
                  );

                  return (
                    <div key={dept.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />

                          <span
                            className={
                              "text-sm truncate " +
                              (isDark ? "text-slate-300" : "text-slate-700")
                            }
                          >
                            {dept.name}
                          </span>
                        </div>

                        <span
                          className={
                            "text-sm font-semibold ml-3 " +
                            (isDark ? "text-white" : "text-slate-800")
                          }
                        >
                          {currentAppointments}
                        </span>
                      </div>

                      <div
                        className={
                          "h-2 rounded-full overflow-hidden " +
                          (isDark ? "bg-slate-800" : "bg-slate-100")
                        }
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: percentage + "%",
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pie Chart */}

              <div className="flex items-center justify-center min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.departments.slice(0, 6).map((department) => ({
                        name: department.name,
                        value: parseInt(department.appointment_count) || 0,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.departments.slice(0, 6).map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================
      BOTTOM INFO
  ========================================================= */}

      <div
        className={
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 text-xs " +
          (isDark ? "text-slate-600" : "text-slate-400")
        }
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={13} />
          <span>Dashboard data refreshes automatically every 60 seconds.</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FileText size={13} />
          <span>Smart Hospital Management System</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
