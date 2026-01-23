import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(({ label, icon: Icon, error, className, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input 
          ref={ref}
          className={twMerge(
            "w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow outline-none transition-all py-2.5",
            Icon ? 'pl-10' : 'pl-3',
            error ? 'border-red-500 focus:ring-red-200' : '',
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';