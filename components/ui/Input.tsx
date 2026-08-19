import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700/80 rounded-lg py-2 px-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
