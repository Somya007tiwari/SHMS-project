import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data from the server. Please try again.',
  onRetry,
}) {
  return (
    <div className="card p-8 dark:bg-gray-900 dark:border-gray-800 border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
        >
          <RotateCcw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
