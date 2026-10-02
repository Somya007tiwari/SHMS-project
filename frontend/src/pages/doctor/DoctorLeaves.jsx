import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorService } from "../../services/services";
import { Calendar, Clock, Trash2, Plus, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const DoctorLeaves = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const todayStr = dayjs().format("YYYY-MM-DD");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [isPartialDay, setIsPartialDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  // Affected appointments warning modal state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [affectedList, setAffectedList] = useState([]);

  // Fetch doctor leaves
  const { data: leaves, isLoading } = useQuery({
    queryKey: ["doctorLeaves"],
    queryFn: () => doctorService.getMyLeaves().then((r) => r.data.data),
  });

  // Create leave mutation
  const createMutation = useMutation({
    mutationFn: (data) => doctorService.createLeave(data),
    onSuccess: (res) => {
      const { leave, affectedCount, affectedAppointments } = res.data.data || {};
      toast.success("Leave scheduled successfully!");
      queryClient.invalidateQueries(["doctorLeaves"]);
      queryClient.invalidateQueries(["doctorSchedule"]);
      queryClient.invalidateQueries(["slots"]);

      if (affectedCount > 0) {
        setAffectedList(affectedAppointments || []);
        setWarningModalOpen(true);
      }

      // Reset form
      setReason("");
      setIsPartialDay(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to schedule leave");
    },
  });

  // Delete leave mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => doctorService.deleteLeave(id),
    onSuccess: () => {
      toast.success("Leave deleted");
      queryClient.invalidateQueries(["doctorLeaves"]);
      queryClient.invalidateQueries(["slots"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete leave");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date cannot be before start date");
      return;
    }
    if (startDate < todayStr) {
      toast.error("Cannot schedule leave for past dates");
      return;
    }
    if (isPartialDay) {
      if (!startTime || !endTime) {
        toast.error("Please select start and end times for partial day leave");
        return;
      }
      if (startTime >= endTime) {
        toast.error("End time must be after start time");
        return;
      }
    }

    createMutation.mutate({
      startDate,
      endDate,
      startTime: isPartialDay ? startTime : null,
      endTime: isPartialDay ? endTime : null,
      reason,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
          Unavailability & Leave Management
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Block dates or specific hours when you are away. Slots during your leave will automatically be blocked for patient bookings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Leave Form */}
        <div className={`card p-6 h-fit ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
          <h2 className={`font-bold text-base mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <Plus size={18} className="text-blue-500" /> Apply New Leave
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            {/* Partial Day Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPartialDay}
                  onChange={(e) => setIsPartialDay(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <span className="font-medium">Partial Day / Specific Hours</span>
              </label>
            </div>

            {isPartialDay && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-gray-700/40 rounded-xl">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-gray-400 mb-1">
                    From Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input-field py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-gray-400 mb-1">
                    To Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input-field py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  Reason (Optional)
                </label>
                <span className="text-[11px] text-slate-400">{reason.length}/300</span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="e.g., Medical conference, personal leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary w-full py-2.5 text-sm justify-center disabled:opacity-50"
            >
              {createMutation.isPending ? "Scheduling..." : "Apply Leave"}
            </button>
          </form>
        </div>

        {/* Scheduled Leaves List */}
        <div className={`lg:col-span-2 card p-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
          <h2 className={`font-bold text-base mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <Calendar size={18} className="text-blue-500" /> Scheduled Leaves & Off-Times
          </h2>

          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (leaves || []).length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-gray-700/30 rounded-2xl">
              <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-sm text-slate-600 dark:text-gray-300">No scheduled leaves</p>
              <p className="text-xs text-slate-400 mt-1">Your availability follows your regular weekly schedule.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(leaves || []).map((leave) => {
                const isPast = dayjs(leave.end_date).isBefore(dayjs(), "day");

                return (
                  <div
                    key={leave.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isDark ? "border-gray-700 bg-gray-700/30" : "border-slate-100 bg-slate-50/50"
                    } ${isPast ? "opacity-50" : ""}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-white">
                          {dayjs(leave.start_date).format("MMM D, YYYY")}
                          {leave.start_date !== leave.end_date &&
                            ` - ${dayjs(leave.end_date).format("MMM D, YYYY")}`}
                        </span>
                        {isPast ? (
                          <span className="text-[10px] bg-slate-200 dark:bg-gray-600 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            Active Leave
                          </span>
                        )}
                      </div>

                      {leave.start_time && leave.end_time ? (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                          <Clock size={12} />
                          {String(leave.start_time).substring(0, 5)} - {String(leave.end_time).substring(0, 5)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Full Day Leave</p>
                      )}

                      {leave.reason && (
                        <p className="text-xs text-slate-500 dark:text-gray-400 pt-0.5">
                          "{leave.reason}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteMutation.mutate(leave.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      title="Remove leave"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Affected Appointments Warning Modal */}
      <Modal
        isOpen={warningModalOpen}
        onClose={() => setWarningModalOpen(false)}
        title="⚠️ Affected Appointments Warning"
        footer={
          <button
            onClick={() => setWarningModalOpen(false)}
            className="btn-primary px-6 py-2 text-sm"
          >
            Understood
          </button>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <AlertTriangle size={16} />
              {affectedList.length} appointment(s) overlap with your new leave!
            </p>
            <p>
              These active appointments have been flagged as <strong>"Needs Reschedule"</strong> so the patients can choose a new date and time.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {affectedList.map((appt) => (
              <div
                key={appt.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{appt.patient_name}</p>
                  <p className="text-slate-500 dark:text-gray-400">
                    {dayjs(appt.appointment_date).format("MMM D, YYYY")} at {String(appt.appointment_time).substring(0, 5)}
                  </p>
                </div>
                <span className="badge badge-pending text-[10px]">Needs Reschedule</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DoctorLeaves;
