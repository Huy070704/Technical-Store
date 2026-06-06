import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styleText = `
  @keyframes shrinkWidth {
    from { width: 100%; }
    to { width: 0%; }
  }
  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(50px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
`;

const ToastCard = ({ toast, onClose }: { toast: ToastItem; onClose: () => void }) => {
  const { type, message, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      icon: 'check_circle',
      title: 'Thành công',
      bgClass: 'bg-white/95 border-emerald-500/30 shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
      iconClass: 'bg-emerald-500/10 text-emerald-600',
      progressClass: 'bg-emerald-500',
    },
    error: {
      icon: 'error',
      title: 'Lỗi',
      bgClass: 'bg-white/95 border-red-500/30 shadow-[0_8px_30px_rgba(239,68,68,0.15)]',
      iconClass: 'bg-red-500/10 text-red-600',
      progressClass: 'bg-red-500',
    },
    warning: {
      icon: 'warning',
      title: 'Cảnh báo',
      bgClass: 'bg-white/95 border-amber-500/30 shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
      iconClass: 'bg-amber-500/10 text-amber-600',
      progressClass: 'bg-amber-500',
    },
    info: {
      icon: 'info',
      title: 'Thông báo',
      bgClass: 'bg-white/95 border-blue-500/30 shadow-[0_8px_30px_rgba(59,130,246,0.15)]',
      iconClass: 'bg-blue-500/10 text-blue-600',
      progressClass: 'bg-blue-500',
    },
  }[type];

  return (
    <div
      className={`relative flex items-start gap-4 w-full max-w-sm p-4 rounded-xl border backdrop-blur-md pointer-events-auto transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${typeConfig.bgClass}`}
      style={{
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div className={`flex items-center justify-center p-2 rounded-lg shrink-0 ${typeConfig.iconClass}`}>
        <MaterialIcon name={typeConfig.icon} className="text-[20px]" filled />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <p className="text-sm font-bold text-slate-800 leading-none">{typeConfig.title}</p>
        <p className="text-xs text-slate-600 leading-relaxed mt-1">{message}</p>
      </div>

      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0"
      >
        <MaterialIcon name="close" className="text-[16px]" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full rounded-b-xl overflow-hidden pointer-events-none">
        <div
          className={`h-full ${typeConfig.progressClass}`}
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      <style dangerouslySetInnerHTML={{ __html: styleText }} />
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
