import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-text-primary dark:text-gray-200">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg border text-sm
            border-border bg-white text-text-primary
            dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500
            placeholder:text-text-secondary
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:bg-gray-50 disabled:cursor-not-allowed dark:disabled:bg-gray-700
            ${error ? 'border-danger focus:ring-danger/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
