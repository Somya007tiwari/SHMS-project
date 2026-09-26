import React from 'react';

export const LoadingSkeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`skeleton rounded-lg ${className}`} />
);

export const CardSkeleton = () => (
  <div className="card p-6 space-y-4">
    <div className="flex items-center gap-4">
      <LoadingSkeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton className="h-4 w-2/3" />
        <LoadingSkeleton className="h-3 w-1/3" />
      </div>
    </div>
    <LoadingSkeleton className="h-4 w-full" />
    <LoadingSkeleton className="h-4 w-5/6" />
    <LoadingSkeleton className="h-4 w-3/4" />
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl">
        {Array.from({ length: cols }).map((_, j) => (
          <LoadingSkeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="card p-6 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <LoadingSkeleton className="h-3 w-24" />
            <LoadingSkeleton className="h-8 w-16" />
          </div>
          <LoadingSkeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
