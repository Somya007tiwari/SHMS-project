import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, FileText, Download, Calendar, User, Stethoscope, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { prescriptionService } from '../services/services';
import toast from 'react-hot-toast';

const PublicSharedPrescription = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchShared = async () => {
      setLoading(true);
      setIsExpired(false);
      try {
        const res = await prescriptionService.getSharedPrescription(token);
        setPrescription(res.data?.data || res.data);
      } catch (err) {
        if (err.response?.status === 410) {
          setIsExpired(true);
        } else {
          toast.error(err.response?.data?.message || 'Failed to load shared prescription');
        }
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchShared();
  }, [token]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await prescriptionService.downloadSharedPDF(token);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescription?.prescription_number || 'shared'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded prescription PDF');
    } catch (err) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <Heart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Smart Hospital System</h1>
          <p className="text-xs text-slate-400">Shared Digital Prescription</p>
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 p-6 sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600 dark:text-gray-300 font-medium">Loading Prescription Details...</p>
          </div>
        ) : isExpired ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Share Link Expired or Revoked</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-6">
              This prescription share link is no longer valid. Please request a new share link from the patient.
            </p>
            <Link to="/" className="btn-secondary px-6 py-2">Go to Homepage</Link>
          </div>
        ) : prescription ? (
          <div>
            {/* Top Info Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-gray-800">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-mono">
                  {prescription.prescription_number}
                </span>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <Calendar size={13} /> {new Date(prescription.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
              </button>
            </div>

            {/* Doctor Info Box */}
            <div className="my-6 p-4 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-200 dark:border-gray-700/60 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <User size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-base">Dr. {prescription.doctor_name}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <Stethoscope size={13} /> {prescription.specialization} • {prescription.qualification || 'MBBS'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Department: {prescription.department_name || 'General Medicine'}</p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical Diagnosis</h3>
              <p className="text-sm font-medium text-slate-800 dark:text-gray-200 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                {prescription.diagnosis || 'Clinical evaluation'}
              </p>
            </div>

            {/* Medicines List */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Prescribed Medicines</h3>
              <div className="space-y-3">
                {prescription.items && prescription.items.length > 0 ? (
                  prescription.items.map((item, index) => (
                    <div key={index} className="p-3.5 bg-white dark:bg-gray-800/80 rounded-xl border border-slate-200 dark:border-gray-700">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {index + 1}. {item.medicine_name}
                        </p>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                          {item.dosage}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs text-slate-500 dark:text-gray-400">
                        <p><span className="font-medium text-slate-700 dark:text-gray-300">Frequency:</span> {item.frequency}</p>
                        <p><span className="font-medium text-slate-700 dark:text-gray-300">Duration:</span> {item.duration_days} days</p>
                        <p><span className="font-medium text-slate-700 dark:text-gray-300">Timing:</span> {item.timing || 'After food'}</p>
                      </div>
                      {item.instructions && (
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 pt-2 border-t border-slate-100 dark:border-gray-700/60 italic">
                          Instructions: {item.instructions}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No medicine items recorded.</p>
                )}
              </div>
            </div>

            {/* Advice */}
            {prescription.advice && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor's Advice</h3>
                <p className="text-sm text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-800 p-3 rounded-lg">
                  {prescription.advice}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShieldAlert size={36} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Prescription Not Found</h2>
            <Link to="/" className="btn-secondary px-6 py-2">Go to Homepage</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSharedPrescription;
