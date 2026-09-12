import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse p-4">
      <div className="h-6 bg-slate-200 rounded-lg w-1/4 mb-4"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 items-center">
          <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
            <div className="h-2.5 bg-slate-150 rounded w-1/2"></div>
          </div>
          <div className="h-7 w-20 bg-slate-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  );
};
