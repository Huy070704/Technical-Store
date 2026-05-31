import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';
import { GoogleIcon } from './GoogleIcon';

type GoogleAuthMode = 'login' | 'signup';

const LABELS: Record<GoogleAuthMode, string> = {
  login: 'Đăng nhập bằng Google',
  signup: 'Đăng ký bằng Google',
};

interface GoogleAuthButtonProps {
  mode: GoogleAuthMode;
  disabled?: boolean;
}

export const GoogleAuthButton = ({ mode, disabled }: GoogleAuthButtonProps) => {
  const handleClick = () => {
    if (disabled) return;
    authService.startGoogleAuth();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={authForm.googleBtn}
      aria-label={LABELS[mode]}
    >
      <span className={authForm.googleBtnGlow} aria-hidden="true" />
      <GoogleIcon size={18} />
      <span className="relative z-[1]">{LABELS[mode]}</span>
    </button>
  );
};
