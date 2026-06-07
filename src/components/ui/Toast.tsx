import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';
interface ToastItem { id: number; message: string; type: ToastType; }
interface ToastContextValue { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let counter = 0;

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-[280px]
            bg-white dark:bg-gray-800
            ${t.type === 'success' ? 'border-l-4 border-success' : 'border-l-4 border-danger'}`}
          >
            {t.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              : <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
            }
            <span className="flex-1 text-text-primary dark:text-gray-100">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
