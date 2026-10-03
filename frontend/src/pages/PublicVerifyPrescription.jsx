import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Heart, Calendar, User, Stethoscope, Building2, Loader2 } from 'lucide-react';
import { prescriptionService } from '../services/services';

const PublicVerifyPrescription = () => {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await prescriptionService.verifyCode(code);
        setData(res.data?.data || res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to verify prescription.');
      } finally {
        setLoading(false);
      }
    };
    if (code) verify();
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <Heart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Smart Hospital System</h1>
          <p className="text-xs text-slate-400">Digital Prescription Verification</p>
        </div>
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 p-6 sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600 dark:text-gray-300 font-medium">Verifying Prescription Authenticity...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-6">{error}</p>
            <Link to="/" className="btn-secondary px-6 py-2">Go to Homepage</Link>
          </div>
        ) : data && data.valid ? (
          <div>
            {/* Valid Badge */}
            <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 mb-6 text-center">
              <ShieldCheck size={28} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-base">Verified Authentic Prescription</p>
                <p className="text-xs opacity-80">This document was officially issued by Smart Hospital System.</p>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="space-y-4 text-sm text-slate-700 dark:text-gray-300 divide-y divide-slate-100 dark:divide-gray-800">
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5"><Building2 size={16} /> Hospital</span>
                <span className="font-semibold text-slate-900 dark:text-white">{data.hospitalName}</span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5"><ShieldCheck size={16} /> Prescription #</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{data.prescriptionNumber}</span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5"><User size={16} /> Issued By</span>
                <span className="font-semibold text-slate-900 dark:text-white">{data.doctorName}</span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5"><Stethoscope size={16} /> Specialization</span>
                <span className="font-medium">{data.specialization}</span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5"><Calendar size={16} /> Date of Issue</span>
                <span className="font-medium">{new Date(data.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="mt-8 p-3 bg-slate-100 dark:bg-gray-800/60 rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-gray-400">
                🔒 Patient medical details and prescribed medicines are confidential and omitted from public verification.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Invalid Prescription Code</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-6">
              The verification code provided does not match any valid prescription in our records.
            </p>
            <Link to="/" className="btn-secondary px-6 py-2">Go to Homepage</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicVerifyPrescription;
