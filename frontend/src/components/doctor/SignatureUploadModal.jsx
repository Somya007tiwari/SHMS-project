import React, { useState } from 'react';
import { X, Upload, Trash2, PenTool, Loader2, Check } from 'lucide-react';
import { doctorService } from '../../services/services';
import toast from 'react-hot-toast';

const SignatureUploadModal = ({ isOpen, onClose, currentSignatureUrl, onSignatureUpdated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentSignatureUrl || null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selected.type)) {
      toast.error('Only PNG or JPG images are allowed');
      return;
    }

    if (selected.size > 500 * 1024) {
      toast.error('File size exceeds allowed limit of 500KB');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a signature image file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);

      const res = await doctorService.uploadSignature(formData);
      toast.success('Signature uploaded successfully!');
      if (onSignatureUpdated) onSignatureUpdated(res.data?.data?.signature_url || preview);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload signature');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await doctorService.deleteSignature();
      toast.success('Signature removed');
      setPreview(null);
      setFile(null);
      if (onSignatureUpdated) onSignatureUpdated(null);
      onClose();
    } catch (err) {
      toast.error('Failed to remove signature');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
            <PenTool size={20} className="text-blue-600" />
            <span>Doctor Signature</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-gray-400 my-4">
          Upload your official signature image to embed it directly on generated prescription PDFs.
        </p>

        {/* Signature Preview */}
        <div className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-gray-700 rounded-2xl p-6 bg-slate-50 dark:bg-gray-800/40">
          {preview ? (
            <div className="text-center">
              <img src={preview} alt="Doctor Signature" className="max-h-24 mx-auto object-contain bg-white dark:bg-gray-800 p-2 rounded-lg border border-slate-200 dark:border-gray-700 mb-3" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                <Check size={14} /> Signature Loaded
              </p>
            </div>
          ) : (
            <div className="text-center">
              <PenTool size={36} className="text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400">No signature image uploaded yet.</p>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="space-y-3">
          <label className="btn-secondary w-full py-2.5 text-xs justify-center cursor-pointer">
            <Upload size={16} /> Select Signature Image (PNG/JPG, &lt;500KB)
            <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
          </label>

          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary w-full py-2.5 text-xs justify-center"
            >
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading Signature...</> : 'Save Signature Image'}
            </button>
          )}

          {currentSignatureUrl && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger w-full py-2 text-xs justify-center"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureUploadModal;
