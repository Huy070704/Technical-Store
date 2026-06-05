import MaterialIcon from './MaterialIcon';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: 'primary' | 'error' | 'success' | 'warning';
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  icon = 'help_outline',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  // Map tones to Tailwind styling
  const toneStyles = {
    primary: {
      bg: 'bg-primary/10 text-primary',
      btn: 'bg-primary hover:bg-primary-hover text-on-primary',
    },
    error: {
      bg: 'bg-error/10 text-error',
      btn: 'bg-error hover:bg-error/90 text-on-error',
    },
    success: {
      bg: 'bg-success/10 text-success',
      btn: 'bg-success hover:bg-success/90 text-on-success',
    },
    warning: {
      bg: 'bg-warning/10 text-warning',
      btn: 'bg-warning hover:bg-warning/90 text-on-warning',
    },
  }[confirmTone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
      <div className="w-full max-w-md rounded-xl bg-bg-card p-lg shadow-xl border border-slate-border/50 transition-all scale-up">
        <div className="flex flex-col items-center text-center space-y-md">
          {/* Tone-colored Icon Container */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${toneStyles.bg}`}>
            <MaterialIcon name={icon} className="text-[32px]" />
          </div>

          <div className="space-y-xs">
            <h3 className="text-headline-sm font-bold text-on-surface">
              {title}
            </h3>
            <p className="text-body-md text-secondary">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full items-center justify-center gap-md border-t border-slate-border/30 pt-md mt-md">
            <button
              className="flex-1 rounded-lg border border-slate-border/80 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft"
              onClick={onCancel}
              type="button"
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-xs rounded-lg px-lg py-sm text-label-md transition-colors disabled:opacity-50 ${toneStyles.btn}`}
              onClick={onConfirm}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
