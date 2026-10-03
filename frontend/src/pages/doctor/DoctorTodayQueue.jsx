import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  Users,
  PhoneCall,
  CheckCircle,
  SkipForward,
  UserX,
  Clock,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
  MapPin,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_BADGES = {
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300',
  in_consultation: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold border border-green-400 animate-pulse',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  skipped: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  no_show: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
};

const DoctorTodayQueue = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipTargetToken, setSkipTargetToken] = useState(null);
  const [skipAction, setSkipAction] = useState('mark_skipped'); // 'mark_skipped' | 'back_of_line'

  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowTargetToken, setNoShowTargetToken] = useState(null);

  // Poll doctor's queue every 10 seconds
  const { data: queueData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['doctor-today-queue'],
    queryFn: () => queueService.getDoctorTodayQueue().then((r) => r.data.data),
    refetchInterval: 10000,
  });

  // Call Next Token Mutation
  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Calling next patient');
      qc.invalidateQueries({ queryKey: ['doctor-today-queue'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to call next patient');
    }
  });

  // Update Status Mutation (Complete, Skip, No-show)
  const updateStatusMutation = useMutation({
    mutationFn: ({ tokenId, status, action }) => queueService.updateTokenStatus(tokenId, { status, action }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Token updated');
      setShowSkipModal(false);
      setShowNoShowModal(false);
      setSkipTargetToken(null);
      setNoShowTargetToken(null);
      qc.invalidateQueries({ queryKey: ['doctor-today-queue'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update token status');
    }
  });

  const tokens = queueData || [];
  const activeServingToken = tokens.find((t) => t.status === 'in_consultation');
  const waitingTokens = tokens.filter((t) => t.status === 'waiting');
  const completedTokens = tokens.filter((t) => t.status === 'completed');

  const handleOpenSkip = (token) => {
    setSkipTargetToken(token);
    setSkipAction('mark_skipped');
    setShowSkipModal(true);
  };

  const handleOpenNoShow = (token) => {
    setNoShowTargetToken(token);
    setShowNoShowModal(true);
  };

  const confirmSkip = () => {
    if (!skipTargetToken) return;
    updateStatusMutation.mutate({
      tokenId: skipTargetToken.id,
      status: 'skipped',
      action: skipAction
    });
  };

  const confirmNoShow = () => {
    if (!noShowTargetToken) return;
    updateStatusMutation.mutate({
      tokenId: noShowTargetToken.id,
      status: 'no_show'
    });
  };

  const handleCompleteActive = () => {
    if (!activeServingToken) return;
    updateStatusMutation.mutate({
      tokenId: activeServingToken.id,
      status: 'completed'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Today's OPD Queue Management
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live token queue for {dayjs().format('MMMM D, YYYY')} (Asia/Kolkata). Auto-refreshes every 10s.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Queue Summary Counter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`card p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-medium">Checked-in Today</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{tokens.length}</span>
        </div>

        <div className={`card p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-medium">Currently Waiting</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{waitingTokens.length}</span>
        </div>

        <div className={`card p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-medium">In Consultation</span>
          <span className="text-2xl font-black text-green-600 dark:text-green-400 mt-1 block">{activeServingToken ? 1 : 0}</span>
        </div>

        <div className={`card p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-medium">Completed Today</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{completedTokens.length}</span>
        </div>
      </div>

      {/* Main Grid: Now Serving Panel & Queue List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Column: NOW SERVING PANEL */}
        <div className="space-y-4">
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Now Serving Panel
          </h2>

          <div className={`card p-6 rounded-3xl border-2 shadow-xl relative space-y-5 ${
            activeServingToken
              ? 'bg-gradient-to-br from-green-950/80 via-slate-900 to-slate-900 border-green-500/60 text-white'
              : isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                Active Consultation
              </span>
              {activeServingToken && (
                <span className="text-xs text-slate-400">
                  Started: {dayjs(activeServingToken.started_at || activeServingToken.called_at).format('h:mm A')}
                </span>
              )}
            </div>

            {activeServingToken ? (
              <div className="space-y-4 text-center py-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-widest block font-bold">TOKEN NUMBER</span>
                  <span className="text-5xl font-black text-green-400 tracking-tight">
                    #{activeServingToken.token_number}
                  </span>
                </div>

                <div className="space-y-1 pt-2">
                  <h3 className="text-xl font-bold text-white">
                    {activeServingToken.patient_name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Slot Time: {String(activeServingToken.appointment_time).substring(0, 5)} • Gender: {(activeServingToken.gender || 'N/A').toUpperCase()} • Blood: {activeServingToken.blood_group || 'N/A'}
                  </p>
                  {activeServingToken.reason && (
                    <p className="text-xs italic text-slate-400 pt-1">"{activeServingToken.reason}"</p>
                  )}
                </div>

                {/* Serving Actions */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    onClick={handleCompleteActive}
                    disabled={updateStatusMutation.isPending}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                  >
                    <CheckCircle size={16} /> Complete Consultation
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenSkip(activeServingToken)}
                      className="flex-1 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30"
                    >
                      <SkipForward size={14} className="inline mr-1" /> Skip
                    </button>
                    <button
                      onClick={() => handleOpenNoShow(activeServingToken)}
                      className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 font-semibold text-xs border border-red-500/30"
                    >
                      <UserX size={14} className="inline mr-1" /> No-Show
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <Users size={40} className="mx-auto text-slate-500 opacity-60" />
                <p className="font-semibold text-sm">No patient currently in consultation</p>
                <p className="text-xs text-slate-400">Click "Call Next Patient" below to serve the next token in queue.</p>

                <div className="pt-4">
                  <button
                    onClick={() => callNextMutation.mutate()}
                    disabled={callNextMutation.isPending || waitingTokens.length === 0}
                    className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PhoneCall size={16} /> Call Next Patient ({waitingTokens.length} waiting)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: QUEUE LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Waiting Queue List ({waitingTokens.length})
            </h2>

            <button
              onClick={() => callNextMutation.mutate()}
              disabled={callNextMutation.isPending || !!activeServingToken || waitingTokens.length === 0}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={activeServingToken ? 'Complete current consultation first' : 'Call next waiting patient'}
            >
              <PhoneCall size={14} /> Call Next
            </button>
          </div>

          {tokens.length === 0 ? (
            <div className={`card p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <Users size={48} className="mx-auto text-slate-400 mb-3" />
              <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                No one in the queue today
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Patients will appear here automatically when they check in for today's appointments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className={`card p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    token.status === 'in_consultation'
                      ? 'border-green-500/80 bg-green-500/10 shadow-md'
                      : token.status === 'waiting'
                      ? isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'
                      : isDark ? 'bg-slate-900/30 border-slate-800/60 opacity-60' : 'bg-slate-50 border-slate-100 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Big Token Badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 ${
                      token.status === 'in_consultation'
                        ? 'bg-green-600 text-white'
                        : token.status === 'waiting'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      #{token.token_number}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {token.patient_name}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${STATUS_BADGES[token.status]}`}>
                          {token.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Slot: {String(token.appointment_time).substring(0, 5)} • Checked in: {dayjs(token.checked_in_at).format('h:mm A')}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Waiting Items */}
                  {token.status === 'waiting' && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenSkip(token)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 transition-colors"
                      >
                        <SkipForward size={13} className="inline mr-1" /> Skip
                      </button>
                      <button
                        onClick={() => handleOpenNoShow(token)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 transition-colors"
                      >
                        <UserX size={13} className="inline mr-1" /> No-Show
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipModal && skipTargetToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold">Skip Token #{skipTargetToken.token_number}?</h3>
            <p className="text-xs text-slate-400">
              Patient: <strong>{skipTargetToken.patient_name}</strong>
            </p>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold uppercase text-slate-400">Choose Action:</label>
              <label className="flex items-center gap-2 text-xs p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="skipAction"
                  value="mark_skipped"
                  checked={skipAction === 'mark_skipped'}
                  onChange={(e) => setSkipAction(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold block">Mark as Skipped</span>
                  <span className="text-[11px] text-slate-400">Patient leaves queue for today</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="skipAction"
                  value="back_of_line"
                  checked={skipAction === 'back_of_line'}
                  onChange={(e) => setSkipAction(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold block">Move to Back of Line</span>
                  <span className="text-[11px] text-slate-400">Assigns next token number at the end of queue</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowSkipModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSkip}
                disabled={updateStatusMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Confirmation Modal */}
      {showNoShowModal && noShowTargetToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold text-red-500">Mark Token #{noShowTargetToken.token_number} as No-Show?</h3>
            <p className="text-xs text-slate-400">
              Patient <strong>{noShowTargetToken.patient_name}</strong> will be marked as no-show for today's appointment.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowNoShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmNoShow}
                disabled={updateStatusMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Mark No-Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorTodayQueue;
