import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium tracking-wide rounded-md border';
  
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/40',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/40',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/40',
    info: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/40',
    purple: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/40',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
