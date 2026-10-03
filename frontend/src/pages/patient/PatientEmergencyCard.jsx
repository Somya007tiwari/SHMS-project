import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { emergencyCardService, healthProfileService, patientService } from '../../services/services';
import { useTheme } from '../../context/ThemeContext';
import QRCode from 'qrcode';
import {
  ShieldAlert,
  QrCode,
  Copy,
  Download,
  Printer,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  PhoneCall,
  User,
  Activity,
  Calendar,
  Lock,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const PatientEmergencyCard = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const [isEnabled, setIsEnabled] = useState(false);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showAllergies, setShowAllergies] = useState(true);
  const [showConditions, setShowConditions] = useState(false);
  const [showContact, setShowContact] = useState(true);
  const [showAge, setShowAge] = useState(false);

  const [publicUrl, setPublicUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  // Fetch emergency card settings
  const { data: cardData, isLoading: isCardLoading, error: cardError } = useQuery({
    queryKey: ['emergency-card-me'],
    queryFn: () => emergencyCardService.getMyCard().then((r) => r.data.data),
  });

  // Fetch patient profile
  const { data: patientData } = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => patientService.getMyProfile().then((r) => r.data.data || r.data),
  });

  // Fetch patient health profile
  const { data: healthProfile } = useQuery({
    queryKey: ['patient-health-profile-me'],
    queryFn: () => healthProfileService.getByPatient('me').then((r) => r.data.data || r.data),
  });

  // Update local state when cardData arrives
  useEffect(() => {
    if (cardData) {
      setIsEnabled(cardData.is_enabled ?? false);
      setShowBloodGroup(cardData.show_blood_group ?? true);
      setShowAllergies(cardData.show_allergies ?? true);
      setShowConditions(cardData.show_conditions ?? false);
      setShowContact(cardData.show_contact ?? true);
      setShowAge(cardData.show_age ?? false);

      if (cardData.publicUrl) {
        setPublicUrl(cardData.publicUrl);
      }
    }
  }, [cardData]);

  // Generate QR Code image when publicUrl changes
  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [publicUrl]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: (data) => emergencyCardService.updateMyCard(data),
    onSuccess: (res) => {
      toast.success('Emergency card settings saved');
      qc.invalidateQueries({ queryKey: ['emergency-card-me'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update emergency card settings');
    }
  });

  // Regenerate link mutation
  const regenerateMutation = useMutation({
    mutationFn: () => emergencyCardService.regenerateToken(),
    onSuccess: (res) => {
      const data = res.data?.data;
      if (data?.publicUrl) {
        setPublicUrl(data.publicUrl);
      }
      toast.success('Emergency QR code link regenerated!');
      setShowRegenerateModal(false);
      qc.invalidateQueries({ queryKey: ['emergency-card-me'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to regenerate link');
    }
  });

  const handleToggleSetting = (field, currentVal) => {
    const nextVal = !currentVal;
    let payload = {
      isEnabled,
      showBloodGroup,
      showAllergies,
      showConditions,
      showContact,
      showAge
    };

    if (field === 'isEnabled') { setIsEnabled(nextVal); payload.isEnabled = nextVal; }
    if (field === 'showBloodGroup') { setShowBloodGroup(nextVal); payload.showBloodGroup = nextVal; }
    if (field === 'showAllergies') { setShowAllergies(nextVal); payload.showAllergies = nextVal; }
    if (field === 'showConditions') { setShowConditions(nextVal); payload.showConditions = nextVal; }
    if (field === 'showContact') { setShowContact(nextVal); payload.showContact = nextVal; }
    if (field === 'showAge') { setShowAge(nextVal); payload.showAge = nextVal; }

    updateMutation.mutate(payload);
  };

  const handleCopyLink = () => {
    if (!publicUrl) {
      return toast.error('QR Link not generated yet. Click "Regenerate QR"');
    }
    navigator.clipboard.writeText(publicUrl);
    toast.success('Emergency card link copied to clipboard!');
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return toast.error('QR code not ready');
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `emergency-card-qr-${patientData?.first_name || 'patient'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Downloaded Emergency QR Code');
  };

  const handlePrintCard = () => {
    window.print();
  };

  // Compute patient age for live preview
  let calculatedAge = null;
  if (patientData?.date_of_birth) {
    const birthDate = new Date(patientData.date_of_birth);
    const diffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(diffMs);
    calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  const bloodGroupVal = healthProfile?.blood_group || patientData?.blood_group || 'Not set';
  const allergiesVal = healthProfile?.allergies || (Array.isArray(patientData?.allergies) ? patientData?.allergies.join(', ') : patientData?.allergies) || 'None recorded';
  const conditionsVal = healthProfile?.chronic_conditions || (Array.isArray(patientData?.chronic_conditions) ? patientData?.chronic_conditions.join(', ') : patientData?.chronic_conditions) || 'None recorded';
  const contactNameVal = healthProfile?.emergency_contact_name || patientData?.emergency_contact_name || 'Not set';
  const contactPhoneVal = healthProfile?.emergency_contact_phone || patientData?.emergency_contact_phone || 'Not set';

  const isProfileEmpty = !healthProfile?.blood_group && !healthProfile?.allergies && !healthProfile?.emergency_contact_name;

  if (isCardLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (cardError) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 card p-8 rounded-2xl space-y-4">
        <ShieldAlert size={48} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Emergency Card Unavailable</h2>
        <p className="text-slate-500 text-sm">{cardError.response?.data?.message || 'Database migration not applied yet or server error.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Print-Only Wallet Card View (Hidden on screen) */}
      <div className="hidden print:block print:p-4 print:m-0">
        <div className="w-[3.375in] h-[2.125in] border-2 border-red-600 rounded-xl p-3 bg-white text-black text-[10px] flex flex-col justify-between shadow-none font-sans mx-auto">
          <div className="flex items-center justify-between border-b border-red-200 pb-1">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
              <span className="font-extrabold text-[11px] text-red-600 tracking-wider uppercase">EMERGENCY MEDICAL CARD</span>
            </div>
            <span className="font-bold text-[9px] text-gray-500">SHMS</span>
          </div>

          <div className="flex gap-2 items-center my-1">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain flex-shrink-0 border border-gray-300 rounded" />
            )}
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="font-black text-[12px] truncate">{patientData?.first_name || 'Patient'}</p>
              {showBloodGroup && <p><span className="font-bold">Blood:</span> <span className="text-red-700 font-extrabold">{bloodGroupVal}</span></p>}
              {showAge && calculatedAge !== null && <p><span className="font-bold">Age:</span> {calculatedAge} yrs</p>}
              {showContact && <p className="truncate"><span className="font-bold">ICE:</span> {contactNameVal} ({contactPhoneVal})</p>}
            </div>
          </div>

          {showAllergies && (
            <p className="truncate text-[9px] bg-red-50 text-red-900 px-1.5 py-0.5 rounded border border-red-100">
              <span className="font-bold">ALLERGIES:</span> {allergiesVal}
            </p>
          )}

          <div className="text-[7px] text-gray-400 text-center pt-0.5 border-t border-gray-100">
            Scan QR code for full emergency medical information • Powered by SHMS
          </div>
        </div>
      </div>

      {/* Top Header (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Emergency Health Card
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Configure your instant QR code emergency card for first responders and ER personnel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintCard}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Printer size={15} /> Print Wallet Card
          </button>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={15} /> Preview Public Link
            </a>
          )}
        </div>
      </div>

      {/* Warning Alert Banner (Plain Warning Required by Prompt) */}
      <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 flex items-start gap-3 print:hidden">
        <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">Security & Privacy Notice</p>
          <p className="leading-relaxed">
            Anyone who scans this QR can see the details you choose, without logging in.
          </p>
        </div>
      </div>

      {/* Empty Health Profile Hint */}
      {isProfileEmpty && (
        <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <HeartPulse size={18} className="text-blue-500 flex-shrink-0" />
            <span>Your health profile is incomplete. Fill in your blood group, allergies, and emergency contact for accuracy.</span>
          </div>
          <Link
            to="/patient/health-profile"
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 whitespace-nowrap flex-shrink-0"
          >
            Complete Profile
          </Link>
        </div>
      )}

      {/* Main Grid: Card Configuration Controls & Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* Left Column: Controls & Toggles */}
        <div className={`card p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Card Status & Visibility
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Enable or disable public scanning access</p>
            </div>

            {/* Master Enable/Disable Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => handleToggleSetting('isEnabled', isEnabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-600" />
            </label>
          </div>

          {/* Visibility Checkboxes */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Information to Display
            </h3>

            <div className="space-y-3">
              {[
                { key: 'showBloodGroup', label: 'Show Blood Group', val: showBloodGroup, detail: bloodGroupVal },
                { key: 'showAllergies', label: 'Show Recorded Allergies', val: showAllergies, detail: allergiesVal },
                { key: 'showConditions', label: 'Show Chronic Conditions', val: showConditions, detail: conditionsVal },
                { key: 'showContact', label: 'Show Emergency Contact', val: showContact, detail: `${contactNameVal} (${contactPhoneVal})` },
                { key: 'showAge', label: 'Show Patient Age', val: showAge, detail: calculatedAge !== null ? `${calculatedAge} years` : 'Date of birth missing' },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    item.val
                      ? isDark ? 'bg-slate-800/80 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      : isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-slate-50/50 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold block">{item.label}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">{item.detail}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={() => handleToggleSetting(item.key, item.val)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 mt-1"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Eye size={14} className="text-blue-500" />
                Scanned {cardData?.view_count || 0} times
              </span>
              <span>
                Last scan: {cardData?.last_viewed_at ? dayjs(cardData.last_viewed_at).format('MMM D, YYYY h:mm A') : 'Never'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy size={14} /> Copy Link
              </button>
              <button
                onClick={handleDownloadQR}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Save QR PNG
              </button>
              <button
                onClick={() => setShowRegenerateModal(true)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center gap-1 transition-colors"
                title="Regenerate QR Code Link"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mobile / Scanner Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Live Scanner Preview
            </h2>
            <span className="text-xs text-slate-400">What first responders see</span>
          </div>

          {/* Phone Frame Simulator */}
          <div className={`rounded-3xl border-4 border-slate-800 p-5 shadow-xl max-w-sm mx-auto space-y-4 ${
            isEnabled
              ? isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-900 text-white'
              : 'bg-slate-800/40 opacity-60 border-slate-700'
          }`}>
            {/* Phone Top Speaker Notch */}
            <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />

            {/* Emergency Header */}
            <div className="text-center space-y-1 pb-3 border-b border-slate-700">
              <div className="inline-flex items-center gap-1.5 bg-red-600/20 text-red-400 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border border-red-500/30">
                <ShieldAlert size={13} /> Emergency Medical Card
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                {patientData?.first_name || 'Patient'}
              </h3>
              {isEnabled ? (
                <span className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> Card Active & Accessible
                </span>
              ) : (
                <span className="text-[10px] text-red-400 flex items-center justify-center gap-1">
                  <Lock size={12} /> Card Disabled by Patient
                </span>
              )}
            </div>

            {/* QR Code Container */}
            {qrDataUrl && isEnabled && (
              <div className="p-3 bg-white rounded-2xl w-36 h-36 mx-auto flex items-center justify-center shadow-md">
                <img src={qrDataUrl} alt="Emergency QR Code" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Details Cards */}
            {isEnabled ? (
              <div className="space-y-2.5 text-xs text-slate-200 pt-1">
                {showBloodGroup && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Blood Group</span>
                    <span className="font-extrabold text-red-400 text-sm">{bloodGroupVal}</span>
                  </div>
                )}

                {showAge && calculatedAge !== null && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Age</span>
                    <span className="font-bold text-white">{calculatedAge} years</span>
                  </div>
                )}

                {showAllergies && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/40 space-y-1">
                    <span className="text-red-300 text-[11px] font-bold block uppercase tracking-wider">Allergies</span>
                    <p className="text-white text-xs font-semibold">{allergiesVal}</p>
                  </div>
                )}

                {showConditions && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/40 space-y-1">
                    <span className="text-amber-300 text-[11px] font-bold block uppercase tracking-wider">Chronic Conditions</span>
                    <p className="text-white text-xs font-semibold">{conditionsVal}</p>
                  </div>
                )}

                {showContact && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Emergency Contact</span>
                    <p className="font-bold text-white">{contactNameVal}</p>
                    <p className="text-blue-400 text-xs font-mono">{contactPhoneVal}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Lock size={32} className="mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">Emergency card is disabled</p>
                <p className="text-[11px]">Toggle the switch above to enable public scanning access.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-amber-500">
              <RefreshCw size={24} />
              <h3 className="text-lg font-bold">Regenerate Emergency QR Link?</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will create a brand new secret QR token. <strong className="text-red-500">All previously printed cards and shared links will stop working immediately.</strong>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientEmergencyCard;
