import { ChevronUp, ChevronDown } from 'lucide-react';

interface SpinnerInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  prefix?: string;
  label?: string;
  disabled?: boolean;
}

export const SpinnerInput = ({ value, onChange, min = -100, max = 100, prefix, label, disabled = false }: SpinnerInputProps) => {
  const increment = () => { if (value < max) onChange(value + 1); };
  const decrement = () => { if (value > min) onChange(value - 1); };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-primary dark:text-gray-200">{label}</label>}
      <div className={`flex items-center border border-border dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 ${disabled ? 'opacity-60' : ''}`}>
        <span className="pl-3 text-sm text-text-secondary dark:text-gray-400 select-none">{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          disabled={disabled}
          className="flex-1 px-2 py-2.5 text-sm text-text-primary dark:text-gray-100 bg-transparent focus:outline-none disabled:cursor-not-allowed min-w-0 w-full"
        />
        <div className="flex flex-col border-l border-border dark:border-gray-600">
          <button type="button" onClick={increment} disabled={disabled || value >= max}
            className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 flex items-center justify-center">
            <ChevronUp className="w-3 h-3 text-text-secondary dark:text-gray-400" />
          </button>
          <button type="button" onClick={decrement} disabled={disabled || value <= min}
            className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 flex items-center justify-center border-t border-border dark:border-gray-600">
            <ChevronDown className="w-3 h-3 text-text-secondary dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
