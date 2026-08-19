import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 rounded-lg py-2 pl-3.5 pr-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 cursor-pointer shadow-sm',
            icon && 'pl-10',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
