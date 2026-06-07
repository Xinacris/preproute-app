import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full mx-4 ${maxWidth} z-10`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-gray-700">
            <h3 className="text-base font-semibold text-text-primary dark:text-gray-100">{title}</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
