import React from 'react';

export function StatCardSkeleton() {
  return (
    <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 animate-pulse flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-gray-800" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-1/2" />
        <div className="h-6 bg-slate-200 dark:bg-gray-800 rounded w-3/4" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 dark:bg-gray-900 dark:border-gray-800 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-1/4" />
        </div>
      </div>
      <div className="h-12 bg-slate-200 dark:bg-gray-800 rounded-xl w-full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-200 dark:bg-gray-800 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-gray-800" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 bg-slate-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-1/2" />
        </div>
      </div>
      <div className="w-16 h-6 rounded-full bg-slate-200 dark:bg-gray-800" />
    </div>
  );
}
