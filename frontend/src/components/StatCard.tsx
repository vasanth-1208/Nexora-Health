import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'blue',
}) => {
  const schemeClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  }[colorScheme];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      <div className={`p-3.5 rounded-xl ${schemeClasses.bg} ${schemeClasses.text} border ${schemeClasses.border}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};
