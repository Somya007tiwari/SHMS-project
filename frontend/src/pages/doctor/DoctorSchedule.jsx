import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorService } from "../../services/services";
import { Clock, Calendar, Save, Coffee, Check, AlertCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_DAY_SCHEDULE = {
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: 30,
  hasBreak: false,
  breakStartTime: "13:00",
  breakEndTime: "14:00",
  isActive: true,
};

const DoctorSchedule = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [scheduleState, setScheduleState] = useState({});

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["doctorSchedule"],
    queryFn: () => doctorService.getSchedule("me").then((r) => r.data.data),
  });

  useEffect(() => {
    const initialState = {};
    DAYS_OF_WEEK.forEach((day) => {
      const existing = (scheduleData || []).find(
        (s) => s.day_of_week?.toLowerCase() === day.key
      );
      if (existing) {
        initialState[day.key] = {
          startTime: existing.start_time ? existing.start_time.substring(0, 5) : "09:00",
          endTime: existing.end_time ? existing.end_time.substring(0, 5) : "17:00",
          slotDuration: existing.slot_duration_minutes || 30,
          hasBreak: !!(existing.break_start_time && existing.break_end_time),
          breakStartTime: existing.break_start_time ? existing.break_start_time.substring(0, 5) : "13:00",
          breakEndTime: existing.break_end_time ? existing.break_end_time.substring(0, 5) : "14:00",
          isActive: existing.is_active !== false,
        };
      } else {
        // Default: Mon-Fri active, Sat-Sun off
        initialState[day.key] = {
          ...DEFAULT_DAY_SCHEDULE,
          isActive: !["saturday", "sunday"].includes(day.key),
        };
      }
    });
    setScheduleState(initialState);
  }, [scheduleData]);

  const updateDayState = (dayKey, field, value) => {
    setScheduleState((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => doctorService.updateSchedule(payload),
    onSuccess: () => {
      toast.success("Weekly schedule updated successfully!");
      queryClient.invalidateQueries(["doctorSchedule"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update schedule");
    },
  });

  const handleSave = () => {
    const payload = [];

    for (const day of DAYS_OF_WEEK) {
      const config = scheduleState[day.key];
      if (!config) continue;

      if (config.isActive) {
        // Validate end time > start time
        if (config.startTime >= config.endTime) {
          toast.error(`End time must be after start time for ${day.label}`);
          return;
        }

        // Validate break window if enabled
        if (config.hasBreak) {
          if (!config.breakStartTime || !config.breakEndTime) {
            toast.error(`Please select break start and end times for ${day.label}`);
            return;
          }
          if (config.breakStartTime >= config.breakEndTime) {
            toast.error(`Break start time must be before break end time for ${day.label}`);
            return;
          }
          if (
            config.breakStartTime < config.startTime ||
            config.breakEndTime > config.endTime
          ) {
            toast.error(`Break window must be within working hours for ${day.label}`);
            return;
          }
        }
      }

      payload.push({
        dayOfWeek: day.key,
        isActive: config.isActive,
        startTime: config.startTime,
        endTime: config.endTime,
        slotDurationMinutes: parseInt(config.slotDuration, 10),
        breakStartTime: config.hasBreak ? config.breakStartTime : null,
        breakEndTime: config.hasBreak ? config.breakEndTime : null,
      });
    }

    saveMutation.mutate({ schedule: payload });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            My Weekly Schedule
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure your working hours, slot durations, and break times for each day of the week.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-primary px-6 py-2.5 text-sm flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saveMutation.isPending ? "Saving..." : "Save Schedule"}
        </button>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const config = scheduleState[day.key] || DEFAULT_DAY_SCHEDULE;

          return (
            <div
              key={day.key}
              className={`card p-5 transition-all ${
                isDark ? "bg-gray-800 border-gray-700" : ""
              } ${!config.isActive ? "opacity-75" : ""}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`toggle-${day.key}`}
                    checked={config.isActive}
                    onChange={(e) => updateDayState(day.key, "isActive", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor={`toggle-${day.key}`}
                    className={`font-semibold text-base cursor-pointer ${
                      isDark ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {day.label}
                  </label>
                  <span
                    className={`badge ${
                      config.isActive ? "badge-approved" : "badge-cancelled"
                    }`}
                  >
                    {config.isActive ? "Working" : "Off Day"}
                  </span>
                </div>

                {config.isActive && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={14} />
                    <span>Slot Duration:</span>
                    <select
                      value={config.slotDuration}
                      onChange={(e) =>
                        updateDayState(day.key, "slotDuration", parseInt(e.target.value, 10))
                      }
                      className="input-field py-1 px-2 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={15}>15 mins</option>
                      <option value={20}>20 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                )}
              </div>

              {config.isActive && (
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Working Hours */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={config.startTime}
                      onChange={(e) => updateDayState(day.key, "startTime", e.target.value)}
                      className="input-field py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={config.endTime}
                      onChange={(e) => updateDayState(day.key, "endTime", e.target.value)}
                      className="input-field py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  {/* Break Window Toggle & Inputs */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400 cursor-pointer">
                        <Coffee size={14} className="text-amber-500" />
                        <span>Break Window</span>
                        <input
                          type="checkbox"
                          checked={config.hasBreak}
                          onChange={(e) => updateDayState(day.key, "hasBreak", e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    {config.hasBreak ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-0.5">
                            Break Start
                          </span>
                          <input
                            type="time"
                            value={config.breakStartTime}
                            onChange={(e) =>
                              updateDayState(day.key, "breakStartTime", e.target.value)
                            }
                            className="input-field py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-0.5">
                            Break End
                          </span>
                          <input
                            type="time"
                            value={config.breakEndTime}
                            onChange={(e) =>
                              updateDayState(day.key, "breakEndTime", e.target.value)
                            }
                            className="input-field py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">No break scheduled</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-primary px-8 py-3 text-sm flex items-center gap-2 shadow-lg"
        >
          <Save size={18} />
          {saveMutation.isPending ? "Saving..." : "Save Weekly Schedule"}
        </button>
      </div>
    </div>
  );
};

export default DoctorSchedule;
