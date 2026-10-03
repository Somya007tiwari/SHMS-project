import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Stethoscope,
  MapPin,
  Users,
  Activity,
  Clock,
  ShieldCheck
} from 'lucide-react';
import dayjs from 'dayjs';

const AdminQueueBoard = () => {
  const { isDark } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-refresh every 10 seconds
  const { data: boardData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-queue-board'],
    queryFn: () => queueService.getBoard().then((r) => r.data.data),
    refetchInterval: 10000,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const doctorsList = boardData || [];

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 space-y-6 bg-slate-950 text-white animate-pulse">
        <div className="h-20 bg-slate-900 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 space-y-6 transition-colors ${
      isFullscreen || isDark ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'
    }`}>
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
            <Activity size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                OPD LIVE QUEUE BOARD
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400">
              Live Token Status • {dayjs().format('dddd, MMMM D, YYYY')} (Asia/Kolkata)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh Board
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Board'}
          </button>
        </div>
      </div>

      {/* Board Doctor Cards Grid */}
      {doctorsList.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
          <Stethoscope size={48} className="mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-slate-300">No OPD consultations active right now</h3>
          <p className="text-xs text-slate-500">Doctors will appear here automatically when available for consultations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctorsList.map((doc) => (
            <div
              key={doc.doctorId}
              className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-slate-700 transition-all"
            >
              {/* Card Header: Doctor Info & Room */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">
                    {doc.doctorName}
                  </h2>
                  <p className="text-xs text-blue-400 font-semibold truncate">
                    {doc.specialization || 'General Practice'}
                  </p>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-400 font-black text-xs flex items-center gap-1">
                    <MapPin size={12} /> {doc.roomNumber}
                  </span>
                </div>
              </div>

              {/* Middle Section: NOW SERVING GIANT TOKEN */}
              <div className="text-center py-4 space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  NOW SERVING
                </span>
                {doc.currentToken !== null ? (
                  <div className="space-y-1">
                    <span className="text-6xl font-black text-green-400 tracking-tight drop-shadow-md">
                      #{doc.currentToken}
                    </span>
                    <span className="text-[10px] text-green-400 font-bold block uppercase tracking-wider">
                      In Consultation
                    </span>
                  </div>
                ) : (
                  <div className="py-2">
                    <span className="text-2xl font-bold text-slate-600 block">--</span>
                    <span className="text-[11px] text-slate-500">Waiting for next patient</span>
                  </div>
                )}
              </div>

              {/* Bottom Section: Upcoming Tokens & Waiting Count */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-slate-400">Next Up Tokens</span>
                  <span className="font-bold text-amber-400">{doc.waitingCount} waiting</span>
                </div>

                {doc.nextTokens.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {doc.nextTokens.map((tNum, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs"
                      >
                        #{tNum}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No upcoming tokens</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Board Footer Notice */}
      <div className="text-center text-[10px] text-slate-500 pt-6 border-t border-slate-800 flex items-center justify-center gap-2">
        <ShieldCheck size={14} className="text-green-500" />
        <span>Privacy-Preserving OPD Live Queue Board • Token Numbers Only • Powered by SHMS</span>
      </div>
    </div>
  );
};

export default AdminQueueBoard;
