import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  message = 'There is no data to display for this view at the moment.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="card p-12 dark:bg-gray-900 dark:border-gray-800 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 flex items-center justify-center mb-1">
        <Icon size={32} />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-400 dark:text-gray-400 max-w-sm leading-relaxed">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary py-2 px-4 text-xs mt-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
