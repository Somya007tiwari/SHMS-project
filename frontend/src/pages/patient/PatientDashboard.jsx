import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  FileText,
  Pill,
  ArrowRight,
  Clock,
  HeartPulse,
  Activity,
  Scale,
  Thermometer,
  Bot,
  Check,
} from "lucide-react";
import { patientService, appointmentService } from "../../services/services";
import { StatsSkeleton } from "../../components/ui/LoadingSkeleton";
import { useAuth } from "../../context/AuthContext";

/* ------------------------------------------------------------------ */
/* SAMPLE DATA - replace with real API data when your backend has it   */
/* ------------------------------------------------------------------ */
const SAMPLE_VITALS = [
  {
    label: "Heart Rate",
    value: "72",
    unit: "BPM",
    note: "Normal range",
    icon: HeartPulse,
    tone: "rose",
  },
  {
    label: "Blood Pressure",
    value: "120/80",
    unit: "mmHg",
    note: "Normal range",
    icon: Activity,
    tone: "amber",
  },
  {
    label: "BMI",
    value: "22.4",
    unit: "",
    note: "Healthy range",
    icon: Scale,
    tone: "violet",
  },
  {
    label: "Temperature",
    value: "98.4",
    unit: "°F",
    note: "Normal range",
    icon: Thermometer,
    tone: "red",
  },
];

const SAMPLE_MEDICINES = [
  { id: 1, name: "Vitamin D", time: "09:00 AM", taken: false },
  { id: 2, name: "Paracetamol", time: "02:00 PM", taken: true },
  { id: 3, name: "Calcium", time: "08:00 PM", taken: false },
];

/* ------------------------------------------------------------------ */
/* Style maps (full class names so Tailwind can detect them)           */
/* ------------------------------------------------------------------ */
const VITAL_TONES = {
  rose: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  amber:
    "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  violet:
    "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  red: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
};

const STAT_TONES = {
  blue: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    bar: "bg-blue-500",
    top: "from-blue-500 to-blue-400",
  },
  green: {
    icon: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    bar: "bg-green-500",
    top: "from-green-500 to-emerald-400",
  },
  purple: {
    icon: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    bar: "bg-purple-500",
    top: "from-purple-500 to-fuchsia-400",
  },
  teal: {
    icon: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
    bar: "bg-teal-500",
    top: "from-teal-500 to-cyan-400",
  },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const StatusBadge = ({ status }) => {
  const classes = {
    pending: "badge-pending",
    approved: "badge-approved",
    rejected: "badge-rejected",
    completed: "badge-completed",
    cancelled: "badge-cancelled",
  };
  return (
    <span className={`badge ${classes[status] || "badge-pending"}`}>
      {status}
    </span>
  );
};

/* Stat card with icon, accent bar, and a mini progress indicator.
   `goal` is the value that fills the bar (a display target, not real data). */
const StatTile = ({ title, value, subtitle, icon: Icon, color, goal, to }) => {
  const tone = STAT_TONES[color];
  const percent = Math.min(100, Math.round((value / goal) * 100));
  return (
    <Link to={to} className="stats-card block group">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.top}`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${tone.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${tone.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState(SAMPLE_MEDICINES);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: () => patientService.getDashboard().then((r) => r.data.data),
  });

  const { data: appointmentsData, isLoading: apptLoading } = useQuery({
    queryKey: ["my-appointments", { limit: 5 }],
    queryFn: () =>
      appointmentService.getMyAppointments({ limit: 5 }).then((r) => r.data),
  });

  const upcomingAppointments = useMemo(() => {
    const list =
      appointmentsData?.data?.filter(
        (a) =>
          ["pending", "approved"].includes(a.status) &&
          new Date(a.appointment_date) >= new Date(new Date().toDateString()),
      ) || [];
    return [...list].sort(
      (a, b) =>
        new Date(a.appointment_date) - new Date(b.appointment_date) ||
        String(a.appointment_time).localeCompare(String(b.appointment_time)),
    );
  }, [appointmentsData]);

  const nextAppointment = upcomingAppointments[0];
  const pendingMeds = medicines.filter((m) => !m.taken).length;

  const toggleMedicine = (id) =>
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
    );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---------------- Hero (compact) ---------------- */}
      <section className="rounded-2xl gradient-primary text-white relative overflow-hidden p-5 md:p-6 shadow-lg shadow-blue-900/10">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-70">
              {today}
            </p>
            <h2 className="text-xl md:text-2xl font-bold mt-1">
              {getGreeting()}, {user?.firstName} {user?.lastName} 👋
            </h2>
            <p className="text-sm opacity-80 mt-1">
              Take care of your health. Stay on track with your wellness goals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 lg:w-[30rem]">
            {/* Next appointment */}
            <Link
              to={
                nextAppointment
                  ? "/patient/appointments"
                  : "/patient/book-appointment"
              }
              className="bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl p-3 flex items-center gap-3 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide opacity-70">
                  Next Appointment
                </p>
                {nextAppointment ? (
                  <>
                    <p className="text-sm font-semibold truncate">
                      {new Date(
                        nextAppointment.appointment_date,
                      ).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                      ,{" "}
                      {String(nextAppointment.appointment_time).substring(0, 5)}
                    </p>
                    <p className="text-xs opacity-70 truncate">
                      Dr. {nextAppointment.doctor_name}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold">Book one today</p>
                )}
              </div>
              <ArrowRight
                size={14}
                className="ml-auto opacity-70 flex-shrink-0"
              />
            </Link>

            {/* Reminder */}
            <div className="bg-white/15 backdrop-blur rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <HeartPulse size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide opacity-70">
                  Health Reminder
                </p>
                <p className="text-sm font-semibold truncate">Drink water</p>
                <p className="text-xs opacity-70 truncate">
                  {pendingMeds} {pendingMeds === 1 ? "medicine" : "medicines"}{" "}
                  pending
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            title="Upcoming"
            value={stats?.upcoming_appointments || 0}
            subtitle="appointments"
            icon={Calendar}
            color="blue"
            goal={5}
            to="/patient/appointments"
          />
          <StatTile
            title="Completed"
            value={stats?.completed_appointments || 0}
            subtitle="consultations"
            icon={Clock}
            color="green"
            goal={10}
            to="/patient/appointments"
          />
          <StatTile
            title="Prescriptions"
            value={stats?.total_prescriptions || 0}
            subtitle="prescribed"
            icon={Pill}
            color="purple"
            goal={10}
            to="/patient/prescriptions"
          />
          <StatTile
            title="Medical Records"
            value={stats?.total_records || 0}
            subtitle="uploaded"
            icon={FileText}
            color="teal"
            goal={10}
            to="/patient/reports"
          />
        </div>
      )}

      {/* ---------------- Health summary (sample data) ---------------- */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            Health Summary
          </h3>
          <span className="text-[11px] text-slate-400">Sample data</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_VITALS.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.label}
                className={`rounded-xl border p-4 ${VITAL_TONES[v.tone]}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon size={16} />
                  {v.label}
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {v.value}
                  {v.unit && (
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 ml-1">
                      {v.unit}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-slate-500 dark:text-gray-400">
                    {v.note}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- Appointments + Medicines ---------------- */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming appointments */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Upcoming Appointments
            </h3>
            <Link
              to="/patient/appointments"
              className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {apptLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-700 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-500/5 py-10 px-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
                <CalendarPlus size={26} className="text-white" />
              </div>
              <p className="mt-4 font-semibold text-slate-700 dark:text-gray-200">
                No upcoming appointments
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Consult a specialist in a few taps. Pick a doctor, choose a
                slot, done.
              </p>
              <Link
                to="/patient/book-appointment"
                className="btn-primary px-5 py-2.5 text-sm mt-5"
              >
                <CalendarPlus size={16} /> Book your first appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {appt.doctor_name?.split(" ").slice(-1)[0]?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                      Dr. {appt.doctor_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {appt.specialization}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                      {new Date(appt.appointment_date).toLocaleDateString(
                        "en-IN",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {String(appt.appointment_time).substring(0, 5)}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Today's medicines (sample data, local state) */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              Today's Medicines
            </h3>
            <span className="text-[11px] text-slate-400">Sample data</span>
          </div>
          <div className="space-y-2">
            {medicines.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMedicine(m.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    m.taken
                      ? "bg-green-500 border-green-500"
                      : "border-slate-300 dark:border-gray-600"
                  }`}
                >
                  {m.taken && <Check size={12} className="text-white" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-medium truncate ${
                      m.taken
                        ? "line-through text-slate-400"
                        : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {m.name}
                  </span>
                  <span className="block text-xs text-slate-400">{m.time}</span>
                </span>
                <span
                  className={`badge ${m.taken ? "badge-completed" : "badge-pending"}`}
                >
                  {m.taken ? "Taken" : "Pending"}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- Quick actions ---------------- */}
      <section>
        <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              to: "/patient/book-appointment",
              icon: CalendarPlus,
              label: "Book Appointment",
              color: "from-blue-500 to-blue-700",
              glow: "hover:shadow-blue-500/30",
            },
            {
              to: "/patient/prescriptions",
              icon: Pill,
              label: "My Prescriptions",
              color: "from-purple-500 to-purple-700",
              glow: "hover:shadow-purple-500/30",
            },
            {
              to: "/patient/reports",
              icon: FileText,
              label: "Medical Reports",
              color: "from-teal-500 to-teal-700",
              glow: "hover:shadow-teal-500/30",
            },
            {
              to: "/ai-assistant",
              icon: Bot,
              label: "AI Health Chat",
              color: "from-green-500 to-green-700",
              glow: "hover:shadow-green-500/30",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group rounded-2xl bg-gradient-to-br ${item.color} text-white p-5 flex items-center justify-between shadow-md ${item.glow} hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-200`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={22} />
                  </div>
                  <span className="text-sm font-semibold leading-tight">
                    {item.label}
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="opacity-70 group-hover:translate-x-1 transition-transform flex-shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PatientDashboard;
