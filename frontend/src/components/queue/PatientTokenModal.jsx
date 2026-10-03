import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  MapPin,
  Stethoscope,
  Info
} from 'lucide-react';
import dayjs from 'dayjs';

const STATUS_LABEL = {
  waiting: { text: 'In Queue (Waiting)', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300' },
  in_consultation: { text: 'Now Serving! Proceed to Room', color: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-400 font-extrabold animate-pulse' },
  completed: { text: 'Consultation Completed', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-300' },
  skipped: { text: 'Skipped by Doctor', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-300' },
  no_show: { text: 'Marked No-Show', color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-300' }
};

const PatientTokenModal = ({ appointmentId, onClose }) => {
  const { isDark } = useTheme();

  // Poll token data every 15 seconds
  const { data: tokenData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['my-queue-token', appointmentId],
    queryFn: () => queueService.getMyToken(appointmentId).then((r) => r.data.data),
    refetchInterval: 15000,
    enabled: !!appointmentId,
  });

  if (!appointmentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 relative ${
        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Live OPD Queue Status</h3>
            <p className="text-xs text-slate-400">Refreshes every 15 seconds</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-3 animate-pulse">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl mx-auto" />
            <p className="text-xs text-slate-400">Fetching live token details...</p>
          </div>
        ) : isError || !tokenData ? (
          <div className="py-8 text-center space-y-3">
            <AlertTriangle size={36} className="mx-auto text-amber-500" />
            <p className="text-sm font-semibold">Queue token not available</p>
            <p className="text-xs text-slate-400">{error?.response?.data?.message || 'Check-in has not been performed yet.'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Main Token Display Card */}
            <div className={`p-6 rounded-2xl border text-center space-y-3 relative overflow-hidden ${
              tokenData.status === 'in_consultation'
                ? 'bg-gradient-to-br from-green-950/40 via-slate-900 to-slate-900 border-green-500 text-white shadow-lg shadow-green-500/10'
                : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block">
                YOUR TOKEN NUMBER
              </span>
              <span className="text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tight block">
                #{tokenData.tokenNumber}
              </span>

              {/* Status Badge */}
              <div className="pt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${STATUS_LABEL[tokenData.status]?.color || ''}`}>
                  {STATUS_LABEL[tokenData.status]?.text || tokenData.status}
                </span>
              </div>
            </div>

            {/* Doctor & Room Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                  <Stethoscope size={13} className="text-blue-500" /> Doctor
                </span>
                <p className="font-bold text-slate-900 dark:text-white truncate">Dr. {tokenData.doctorName}</p>
                <p className="text-[10px] text-slate-400 truncate">{tokenData.specialization || 'General Practice'}</p>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                  <MapPin size={13} className="text-blue-500" /> Room / Clinic
                </span>
                <p className="font-bold text-slate-900 dark:text-white">{tokenData.roomNumber || 'Room 101'}</p>
                <p className="text-[10px] text-slate-400">Checked-in {dayjs(tokenData.checkedInAt).format('h:mm A')}</p>
              </div>
            </div>

            {/* Live Queue Metrics: People Ahead & Estimated Wait */}
            {tokenData.status === 'waiting' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-0.5">
                  <span className="text-[11px] font-bold block uppercase tracking-wider">People Ahead</span>
                  <span className="text-2xl font-black">{tokenData.peopleAhead} patient(s)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-300 space-y-0.5">
                  <span className="text-[11px] font-bold block uppercase tracking-wider">Estimated Wait</span>
                  <span className="text-2xl font-black">~{tokenData.estimatedWaitMinutes} mins</span>
                </div>
              </div>
            )}

            {/* Note / Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <span>
                Estimated wait times are dynamically calculated based on consultation durations and may change as the doctor proceeds.
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing...' : 'Refresh Live Status'}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientTokenModal;
