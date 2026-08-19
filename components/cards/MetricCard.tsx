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
        'p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/80 transition-all',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        {trend && (
          <p
            className={cn(
              'text-xs font-medium inline-flex items-center gap-0.5 mt-1',
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {trend.value}
          </p>
        )}
      </div>
      <div className="p-2.5 bg-emerald-50 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700/50 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
        {icon}
      </div>
    </div>
  );
}
