import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Option { value: string; label: string; }
interface SelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  multiple?: boolean;
}

export const Select = ({ options, value, onChange, placeholder = 'Choose from Drop-down', disabled = false, label, error, multiple = false }: SelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : [value].filter(Boolean))
    : typeof value === 'string' ? [value] : [];

  const getLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    const labels = selectedValues
      .map((v) => options.find((o) => o.value === v)?.label)
      .filter((l): l is string => !!l);
    return labels.length > 0 ? labels.join(', ') : placeholder;
  };

  const handleSelect = (optVal: string) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      onChange(arr.includes(optVal) ? arr.filter((v) => v !== optVal) : [...arr, optVal]);
    } else {
      onChange(optVal);
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      {label && <label className="text-sm font-medium text-text-primary dark:text-gray-200">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`
            w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm text-left
            bg-white dark:bg-gray-800 dark:border-gray-600
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:bg-gray-50 disabled:cursor-not-allowed dark:disabled:bg-gray-700
            ${error ? 'border-danger' : 'border-border'}
            ${selectedValues.length === 0 ? 'text-text-secondary dark:text-gray-400' : 'text-text-primary dark:text-gray-100'}
          `}
        >
          <span className="truncate">{getLabel()}</span>
          <ChevronDown className={`w-4 h-4 text-text-secondary dark:text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-secondary dark:text-gray-400">No options</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full text-left px-3 py-2 text-sm
                    hover:bg-primary-light dark:hover:bg-gray-700
                    ${selectedValues.includes(opt.value)
                      ? 'bg-primary-light dark:bg-gray-700 text-primary font-medium'
                      : 'text-text-primary dark:text-gray-100'}
                  `}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};
