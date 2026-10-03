import React, { useEffect, useState } from 'react';
import { X, Share2, Copy, Trash2, Clock, Check, Loader2 } from 'lucide-react';
import { prescriptionService } from '../../services/services';
import toast from 'react-hot-toast';

const SharePrescriptionModal = ({ isOpen, onClose, prescription }) => {
  const [expiresInDays, setExpiresInDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [fetchingShares, setFetchingShares] = useState(false);
  const [shares, setShares] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const fetchActiveShares = async () => {
    if (!prescription?.id) return;
    setFetchingShares(true);
    try {
      const res = await prescriptionService.getShares(prescription.id);
      setShares(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch active shares:', err);
    } finally {
      setFetchingShares(false);
    }
  };

  useEffect(() => {
    if (isOpen && prescription?.id) {
      fetchActiveShares();
    }
  }, [isOpen, prescription]);

  if (!isOpen || !prescription) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const res = await prescriptionService.createShare(prescription.id, { expiresInDays });
      const share = res.data?.data || res.data;
      toast.success(`Created ${expiresInDays}-day share link!`);
      if (share.shareUrl) {
        await navigator.clipboard.writeText(share.shareUrl).catch(() => {});
        toast.success('Share link copied to clipboard!');
      }
      fetchActiveShares();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId) => {
    try {
      await prescriptionService.revokeShare(shareId);
      toast.success('Share link revoked');
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      toast.error('Failed to revoke share link');
    }
  };

  const copyLink = async (shareId, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      toast.success('Link copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
            <Share2 size={20} className="text-blue-600" />
            <span>Share Prescription Link</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Prescription Summary */}
        <div className="my-4 p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">Prescription #{prescription.prescription_number}</p>
          <p className="text-slate-500 dark:text-gray-400">Doctor: Dr. {prescription.doctor_name || 'N/A'}</p>
        </div>

        {/* Select Expiry Duration */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">
            Link Expiration Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[1, 3, 7].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setExpiresInDays(days)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                  expiresInDays === days
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                {days} {days === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreateShare}
          disabled={loading}
          className="btn-primary w-full py-2.5 text-xs justify-center mb-6"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Generating Link...</> : 'Generate & Copy Share Link'}
        </button>

        {/* Active Share Links List */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Share Links</h4>
          {fetchingShares ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No active share links.</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {shares.map(s => {
                const frontendUrl = window.location.origin;
                const fullUrl = s.plainToken ? `${frontendUrl}/prescriptions/shared/${s.plainToken}` : `${frontendUrl}/prescriptions/shared`;
                const isCopied = copiedId === s.id;

                return (
                  <div key={s.id} className="p-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700/80 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> Expires: {new Date(s.expires_at).toLocaleDateString()} {new Date(s.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.plainToken && (
                        <button
                          onClick={() => copyLink(s.id, fullUrl)}
                          className="p-1.5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy Share Link"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleRevoke(s.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Revoke Share Link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePrescriptionModal;
