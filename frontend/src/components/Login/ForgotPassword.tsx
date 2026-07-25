import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from 'lucide-react';
import { FormCard } from './FormCard';
import { OTPPopup } from './OTPPopup';
import { Toast } from '@/components/shared';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: '', color: '#475569' },
    1: { label: 'Yếu', color: '#dc2626' },
    2: { label: 'Trung bình', color: '#f59e0b' },
    3: { label: 'Khá mạnh', color: '#10b981' },
    4: { label: 'Rất mạnh', color: '#10b981' },
  };
  return { score, ...map[score] };
};

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifiedOtp, setVerifiedOtp] = useState<string | null>(null);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Vui lòng nhập email';
        if (!EMAIL_REGEX.test(value.trim())) return 'Email không hợp lệ';
        return '';
      case 'newPassword':
        if (!value) return 'Vui lòng nhập mật khẩu mới';
        if (value.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
        if (!/\d/.test(value)) return 'Mật khẩu phải có ít nhất một chữ số';
        return '';
      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu';
        if (value !== formData.newPassword) return 'Mật khẩu không khớp';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      const emailError = validateField('email', formData.email);
      if (emailError) {
        setErrors({ email: emailError });
        return;
      }

      setIsSubmitting(true);
      const email = formData.email.trim().toLowerCase();

      try {
        await authService.forgotPassword(email);
        setPendingEmail(email);
        setShowOTPPopup(true);
        setToast({ message: 'Mã OTP đã được gửi đến email của bạn!', type: 'success' });
        setErrors({});
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setErrors({
          email: err.response?.data?.message ?? 'Không gửi được OTP. Vui lòng thử lại.',
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const newPasswordError = validateField('newPassword', formData.newPassword);
    const confirmPasswordError = validateField(
      'confirmPassword',
      formData.confirmPassword,
    );
    if (newPasswordError || confirmPasswordError) {
      setErrors({
        newPassword: newPasswordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    if (!pendingEmail || !verifiedOtp) {
      setToast({ message: 'Vui lòng xác thực OTP trước', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(
        pendingEmail,
        verifiedOtp,
        formData.newPassword,
      );

      sessionStorage.setItem(
        'lastResetUser',
        JSON.stringify({ email: pendingEmail, timestamp: Date.now() }),
      );
      setToast({ message: 'Đặt lại mật khẩu thành công!', type: 'success' });
      setShowSuccess(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setToast({
        message:
          err.response?.data?.message ??
          'Đặt lại mật khẩu thất bại. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!pendingEmail) {
      setOtpError('Không có phiên đặt lại mật khẩu');
      return;
    }

    setOtpError('');
    try {
      const verified = await authService.verifyOtp(pendingEmail, otp);
      if (verified) {
        setVerifiedOtp(otp);
        setShowOTPPopup(false);
        setStep(2);
        setToast({ message: 'Xác thực OTP thành công!', type: 'success' });
        setErrors({});
      } else {
        setOtpError('Mã OTP sai hoặc đã hết hạn');
      }
    } catch {
      setOtpError('Xác thực OTP thất bại. Vui lòng thử lại.');
    }
  };

  const handleResendOTP = async () => {
    if (!pendingEmail) {
      setOtpError('Không có phiên đặt lại mật khẩu');
      return;
    }

    try {
      await authService.resendOtp(pendingEmail);
      setOtpError('');
      setToast({ message: 'Đã gửi lại mã OTP mới!', type: 'success' });
    } catch {
      setToast({ message: 'Không gửi lại được OTP', type: 'error' });
    }
  };

  const emailValid = EMAIL_REGEX.test(formData.email.trim());
  const strength = passwordStrength(formData.newPassword);

  return (
    <FormCard
      panelTitle={
        <>
          Khôi phục tài khoản,
          <br />
          bảo mật tuyệt đối
        </>
      }
      pills={['Xác thực OTP tức thì', 'Mật khẩu mã hóa 100%', 'Hỗ trợ CSKH 24/7']}
      onBack={() => (step === 2 ? setStep(1) : navigate('/login'))}
    >
      <div className={authForm.authHeader}>
        {step === 1 ? (
          <>
            <h1 className={authForm.authTitle}>Quên mật khẩu?</h1>
            <p className={authForm.authSubtitle}>
              Nhập email đã đăng ký để nhận mã OTP khôi phục tài khoản.
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
              <Check size={14} strokeWidth={2.2} />
              <span>OTP đã xác thực · {pendingEmail}</span>
            </div>
            <h1 className={authForm.authTitle}>Tạo mật khẩu mới</h1>
            <p className={authForm.authSubtitle}>
              Đặt mật khẩu mới để đăng nhập lại vào Technical Store.
            </p>
          </>
        )}
      </div>

      {!showSuccess && (
        <form onSubmit={handleSubmit} className={authForm.authForm}>
          {step === 1 && (
            <>
              <div className={authForm.formGroup}>
                <span className={authForm.fieldLabel}>Email đã đăng ký</span>
                <div
                  className={`${authForm.inputWrapper} ${errors.email ? authForm.inputWrapperError : ''}`}
                >
                  <div className={authForm.inputIcon}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Nhập email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={authForm.input}
                    autoComplete="email"
                  />
                  {emailValid && !errors.email && (
                    <Check
                      size={16}
                      strokeWidth={2.2}
                      className="shrink-0 text-emerald-400"
                    />
                  )}
                </div>
                {errors.email && (
                  <span className={authForm.errorMessage}>{errors.email}</span>
                )}
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-amber-800/60 bg-amber-950/40 p-3.5">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-amber-400"
                />
                <span className="text-xs leading-5 text-amber-300">
                  Mã OTP có hiệu lực trong <strong>10 phút</strong>. Vui lòng kiểm tra cả hộp thư spam.
                </span>
              </div>

              <button
                type="submit"
                className={authForm.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>

              <div className={authForm.authLinks}>
                <p className={authForm.createAccountText}>
                  Nhớ ra mật khẩu?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className={authForm.linkBtn}
                  >
                    Đăng nhập
                  </button>
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={authForm.formGroup}>
                <span className={authForm.fieldLabel}>Mật khẩu mới</span>
                <div
                  className={`${authForm.inputWrapper} ${errors.newPassword ? authForm.inputWrapperError : ''}`}
                >
                  <div className={authForm.inputIcon}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="Tạo mật khẩu mới"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={authForm.input}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className={authForm.passwordToggle}
                    tabIndex={-1}
                    aria-label="Hiện/ẩn mật khẩu"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.newPassword && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-sm"
                          style={{
                            background:
                              i < strength.score
                                ? strength.color
                                : '#334155',
                          }}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    )}
                  </div>
                )}
                {errors.newPassword && (
                  <span className={authForm.errorMessage}>
                    {errors.newPassword}
                  </span>
                )}
              </div>

              <div className={authForm.formGroup}>
                <span className={authForm.fieldLabel}>Xác nhận mật khẩu</span>
                <div
                  className={`${authForm.inputWrapper} ${errors.confirmPassword ? authForm.inputWrapperError : ''}`}
                >
                  <div className={authForm.inputIcon}>
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Nhập lại mật khẩu mới"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={authForm.input}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <span className={authForm.errorMessage}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={authForm.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </>
          )}
        </form>
      )}

      {showSuccess && (
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/50 p-6 text-center shadow-lg">
          <p className="text-lg font-bold text-emerald-400">
            Đặt lại mật khẩu thành công!
          </p>
          <p className="text-sm text-slate-300">
            Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
          </p>
          <button
            type="button"
            className={authForm.submitBtn}
            onClick={() => navigate('/login')}
          >
            Đến trang đăng nhập
          </button>
        </div>
      )}

      {showOTPPopup && (
        <OTPPopup
          isOpen={showOTPPopup}
          onClose={() => {
            setShowOTPPopup(false);
            setPendingEmail(null);
            setOtpError('');
          }}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          error={otpError}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </FormCard>
  );
};

export default ForgotPassword;
