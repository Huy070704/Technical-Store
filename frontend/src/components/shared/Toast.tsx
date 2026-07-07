import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in-right ${
        isSuccess
          ? 'border-emerald-500/20 bg-emerald-950/90 text-emerald-100'
          : 'border-rose-500/20 bg-rose-950/90 text-rose-100'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
      )}
      <span className="font-medium leading-normal">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className={`ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-transparent p-0 transition-colors border-none cursor-pointer ${
          isSuccess ? 'text-emerald-400 hover:bg-emerald-800/30' : 'text-rose-400 hover:bg-rose-800/30'
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
