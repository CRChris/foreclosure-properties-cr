import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-slate-700/80 transition-all',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        {trend && (
          <p
            className={cn(
              'text-xs font-medium inline-flex items-center gap-0.5 mt-1',
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {trend.value}
          </p>
        )}
      </div>
      <div className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-emerald-400 shrink-0">
        {icon}
      </div>
    </div>
  );
}
