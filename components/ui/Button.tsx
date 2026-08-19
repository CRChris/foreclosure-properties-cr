import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none shadow-sm';
    
    const variants = {
      primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 dark:shadow-emerald-950/40 focus:ring-emerald-500 border border-emerald-500/30',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 focus:ring-slate-400',
      outline: 'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 dark:hover:bg-slate-800/60 dark:text-slate-300 dark:hover:text-white dark:border-slate-700 focus:ring-slate-400',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-200',
      danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/20 dark:shadow-rose-950/40 focus:ring-rose-500 border border-rose-500/30',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
