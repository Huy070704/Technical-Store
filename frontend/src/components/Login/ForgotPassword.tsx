import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { FormCard } from './FormCard';
import { OTPPopup } from './OTPPopup';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifiedOtp, setVerifiedOtp] = useState<string | null>(null);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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
      setErrors({ general: 'Vui lòng xác thực OTP trước' });
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
      setShowSuccess(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrors({
        general:
          err.response?.data?.message ??
          'Đặt lại mật khẩu thất bại. Vui lòng thử lại.',
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
    } catch {
      setOtpError('Không gửi lại được OTP');
    }
  };

  return (
    <FormCard>
      <button
        type="button"
        onClick={() => navigate('/login')}
        className={authForm.backArrowBtn}
        aria-label="Về đăng nhập"
      >
        <ArrowLeft size={20} />
      </button>

      <div className={authForm.authHeader}>
        <h1 className={authForm.authTitle}>Đặt lại mật khẩu</h1>
        <p className={authForm.authSubtitle}>
          {step === 1
            ? 'Nhập email để nhận mã OTP'
            : 'Nhập mật khẩu mới của bạn'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={authForm.authForm}>
        {errors.general && (
          <div className={`${authForm.errorMessageCenter}`}>{errors.general}</div>
        )}

        {step === 1 && (
          <div className={authForm.formGroup}>
            <div
              className={`${authForm.inputWrapper} ${errors.email ? authForm.inputWrapperError : ''}`}
            >
              <div className={authForm.inputIcon}>
                <Mail size={20} />
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
            </div>
            {errors.email && (
              <span className={authForm.errorMessage}>{errors.email}</span>
            )}
          </div>
        )}

        {step === 2 && (
          <>
            <div className={authForm.formGroup}>
              <div
                className={`${authForm.inputWrapper} ${errors.newPassword ? authForm.inputWrapperError : ''}`}
              >
                <div className={authForm.inputIcon}>
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Mật khẩu mới"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className={authForm.input}
                  autoComplete="new-password"
                />
              </div>
              {errors.newPassword && (
                <span className={authForm.errorMessage}>{errors.newPassword}</span>
              )}
            </div>

            <div className={authForm.formGroup}>
              <div
                className={`${authForm.inputWrapper} ${errors.confirmPassword ? authForm.inputWrapperError : ''}`}
              >
                <div className={authForm.inputIcon}>
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Xác nhận mật khẩu"
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
          </>
        )}

        {!showSuccess && (
          <button type="submit" className={authForm.submitBtn} disabled={isSubmitting}>
            {isSubmitting
              ? 'Đang xử lý...'
              : step === 1
                ? 'Gửi OTP'
                : 'Đặt lại mật khẩu'}
          </button>
        )}

        {showSuccess && (
          <div className={authForm.successBox}>
            <p className={authForm.successTitle}>Đặt lại mật khẩu thành công!</p>
            <p className="text-sm text-on-surface-variant">
              Bạn có thể đăng nhập bằng mật khẩu mới.
            </p>
            <button
              type="button"
              className={authForm.successBtn}
              onClick={() => navigate('/login')}
            >
              Đến trang đăng nhập
            </button>
          </div>
        )}
      </form>

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
    </FormCard>
  );
};

export default ForgotPassword;
