import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  let style = 'bg-slate-100 text-slate-700 border-slate-250';

  switch (normalized) {
    case 'AVAILABLE':
    case 'PAID':
    case 'COMPLETED':
    case 'DISPENSED':
    case 'ONLINE':
    case 'APPROVED':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      break;
    case 'OCCUPIED':
    case 'WITH_DOCTOR':
    case 'IN_PROGRESS':
    case 'PROCESSING':
      style = 'bg-blue-50 text-blue-800 border-blue-200';
      break;
    case 'RESERVED':
    case 'RECEIVED':
    case 'QUEUED':
    case 'READY':
      style = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      break;
    case 'WAITING':
    case 'PENDING':
    case 'PAYMENT_PENDING':
    case 'RECOMMENDED':
    case 'DISCHARGE_RECOMMENDED':
      style = 'bg-amber-50 text-amber-800 border-amber-200';
      break;
    case 'CLEANING':
      style = 'bg-purple-50 text-purple-800 border-purple-200';
      break;
    case 'MAINTENANCE':
    case 'BLOCKED':
    case 'REJECTED':
    case 'CRITICAL':
    case 'EMERGENCY':
      style = 'bg-rose-50 text-rose-800 border-rose-200';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border font-mono ${style} ${className}`}
    >
      {normalized}
    </span>
  );
};
