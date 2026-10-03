import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  intent = 'danger', // 'danger' | 'primary'
  isLoading = false,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center"
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
            intent === 'danger'
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
          }`}
        >
          <AlertTriangle size={24} />
        </div>

        <div>
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-800 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="btn-secondary py-2 px-4 text-xs w-1/2 justify-center"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`py-2 px-4 text-xs font-semibold rounded-xl text-white w-1/2 flex items-center justify-center gap-1.5 transition-colors ${
              intent === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
            }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
