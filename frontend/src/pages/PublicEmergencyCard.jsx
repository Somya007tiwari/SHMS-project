import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { emergencyCardService } from '../services/services';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  HeartPulse,
  User,
  Activity,
  Calendar,
  Lock,
  Phone
} from 'lucide-react';

const PublicEmergencyCard = () => {
  const { token } = useParams();

  // Mount meta tag: <meta name="robots" content="noindex">
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      try {
        document.head.removeChild(meta);
      } catch {}
    };
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-emergency-card', token],
    queryFn: () => emergencyCardService.getPublicCard(token).then((r) => r.data.data),
    retry: false,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3 animate-pulse">
          <ShieldAlert size={48} className="mx-auto text-red-500 animate-bounce" />
          <p className="font-semibold text-sm">Loading Emergency Card...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-slate-900 border-2 border-red-900/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <Lock size={48} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-black text-white">Card Not Available</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            This emergency card is invalid, has been disabled by the patient, or the link has expired.
          </p>
          <div className="pt-4 border-t border-slate-800">
            <a
              href="tel:112"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
            >
              <PhoneCall size={18} /> Call Emergency Services (112)
            </a>
          </div>
        </div>
      </div>
    );
  }

  const {
    firstName,
    bloodGroup,
    allergies,
    chronicConditions,
    emergencyContactName,
    emergencyContactPhone,
    age
  } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto pt-2 pb-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <span className="font-black text-xs tracking-wider uppercase text-red-500">
            EMERGENCY MEDICAL CARD
          </span>
        </div>
        <span className="text-xs text-slate-400 font-bold">SHMS Health System</span>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6 space-y-6">
        {/* Patient Greeting */}
        <div className="text-center space-y-1">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold block">
            PATIENT INFORMATION
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {firstName || 'Patient'}
          </h1>
          {age !== null && age !== undefined && (
            <p className="text-xs text-slate-400 font-medium">Age: {age} years old</p>
          )}
        </div>

        {/* High Contrast Emergency Metrics */}
        <div className="space-y-3">
          {/* Blood Group */}
          {bloodGroup && (
            <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-600/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeartPulse size={24} className="text-red-400 flex-shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider block">
                    Blood Group
                  </span>
                  <span className="text-2xl font-black text-white">{bloodGroup}</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-full">
                CRITICAL
              </span>
            </div>
          )}

          {/* Allergies */}
          {allergies && (
            <div className="p-4 rounded-2xl bg-amber-950/60 border-2 border-amber-500/60 space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  RECORDED ALLERGIES
                </span>
              </div>
              <p className="text-base font-bold text-white pl-6 leading-snug">{allergies}</p>
            </div>
          )}

          {/* Chronic Conditions */}
          {chronicConditions && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-blue-400">
                <Activity size={18} className="flex-shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  CHRONIC CONDITIONS
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 pl-6 leading-snug">
                {chronicConditions}
              </p>
            </div>
          )}

          {/* Emergency Contact */}
          {emergencyContactPhone && (
            <div className="p-4 rounded-2xl bg-slate-900 border-2 border-blue-500/40 space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <User size={18} className="flex-shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  EMERGENCY CONTACT (ICE)
                </span>
              </div>

              <div className="pl-6 space-y-2">
                <p className="text-base font-bold text-white">
                  {emergencyContactName || 'Emergency Contact'}
                </p>

                <a
                  href={`tel:${emergencyContactPhone}`}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                >
                  <Phone size={16} /> Call {emergencyContactName || 'Contact'} ({emergencyContactPhone})
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Global Emergency Call 112 Button */}
        <div className="pt-2">
          <a
            href="tel:112"
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-red-600/40 active:scale-[0.99] transition-all"
          >
            <PhoneCall size={20} /> CALL EMERGENCY SERVICES (112)
          </a>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="w-full max-w-md mx-auto text-center pt-4 border-t border-slate-800 text-[10px] text-slate-500">
        This card is provided for emergency medical identification only. Information is managed directly by the patient.
      </div>
    </div>
  );
};

export default PublicEmergencyCard;
