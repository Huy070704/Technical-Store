import { authForm } from '@/styles/authFormClasses';
import { GoogleAuthButton } from './GoogleAuthButton';

interface AuthOAuthDividerProps {
  mode: 'login' | 'signup';
  disabled?: boolean;
}

/** Divider "hoặc" + nút Google — đặt sau nút đăng nhập/đăng ký email */
export const AuthOAuthDivider = ({ mode, disabled }: AuthOAuthDividerProps) => (
  <div className="flex flex-col gap-2">
    <div className={authForm.oauthDivider} role="separator" aria-label="Hoặc">
      <span className={authForm.oauthDividerLine} />
      <span className={authForm.oauthDividerText}>hoặc</span>
      <span className={authForm.oauthDividerLine} />
    </div>
    <GoogleAuthButton mode={mode} disabled={disabled} />
  </div>
);
