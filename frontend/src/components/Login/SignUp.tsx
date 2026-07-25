import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { FormCard } from './FormCard';
import { OTPPopup } from './OTPPopup';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { completeAuthSession } from '@/utils/completeAuthSession';
import { Toast } from '@/components/shared';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_KEY = 'pendingRegistration';

export const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PENDING_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { email: string; timestamp: number };
      if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
        setPendingEmail(parsed.email);
        setFormData((prev) => ({ ...prev, email: parsed.email }));
        setShowOTPPopup(true);
      } else {
        localStorage.removeItem(PENDING_KEY);
      }
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
  }, []);

  const savePending = (email: string) => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ email, timestamp: Date.now() }),
    );
  };

  const clearPending = () => {
    localStorage.removeItem(PENDING_KEY);
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Vui lòng nhập email';
        if (!EMAIL_REGEX.test(value.trim())) return 'Email không hợp lệ';
        return '';
      case 'password':
        if (!value) return 'Vui lòng nhập mật khẩu';
        if (value.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
        return '';
      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu';
        if (value !== formData.password) return 'Mật khẩu không khớp';
        return '';
      case 'name':
        if (!value.trim()) return 'Vui lòng nhập username';
        if (value.trim().length < 2) return 'Username phải có ít nhất 2 ký tự';
        if (value.trim().length > 100) return 'Username không được vượt quá 100 ký tự';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string> = {};
    (Object.keys(formData) as (keyof typeof formData)[]).forEach((key) => {
      const msg = validateField(key, formData[key]);
      if (msg) fieldErrors[key] = msg;
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsSubmitting(true);
    const email = formData.email.trim().toLowerCase();

    try {
      await authService.register({
        email,
        password: formData.password,
        name: formData.name.trim(),
      });

      setPendingEmail(email);
      setShowOTPPopup(true);
      savePending(email);
      setErrors({});
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';

      if (err.response?.status === 409) {
        message = 'Email đã được đăng ký';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (!navigator.onLine) {
        message = 'Không có kết nối mạng';
      }

      setToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!pendingEmail) {
      setToast({ message: 'Thiếu thông tin đăng ký', type: 'error' });
      return;
    }

    try {
      const accessToken = await authService.verifyRegister(pendingEmail, otp);
      clearPending();
      setShowOTPPopup(false);

      sessionStorage.setItem(
        'lastRegisteredUser',
        JSON.stringify({ email: pendingEmail, timestamp: Date.now() }),
      );

      await completeAuthSession(
        accessToken,
        login,
        navigate,
        'Đăng ký thành công! Chào mừng bạn đến Technical Store.',
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setOtpError(err.response?.data?.message ?? 'Xác thực OTP thất bại. Thử gửi lại mã mới.');
    }
  };

  const handleResendOTP = async () => {
    const email = pendingEmail ?? formData.email.trim().toLowerCase();
    if (!email) {
      setToast({ message: 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.', type: 'error' });
      setShowOTPPopup(false);
      clearPending();
      return;
    }

    try {
      await authService.resendOtp(email);
      savePending(email);
      setOtpError('');
      setToast({ message: 'Đã gửi lại mã OTP mới thành công!', type: 'success' });
    } catch (error: unknown) {
      setToast({
        message: getErrorMessage(error, 'Không gửi lại được OTP. Vui lòng thử lại.'),
        type: 'error',
      });
    }
  };

  const handleCloseOTP = () => {
    setShowOTPPopup(false);
    setPendingEmail(null);
    setOtpError('');
    clearPending();
  };

  const textFields = [
    { name: 'name' as const, label: 'Username', placeholder: 'Username', icon: User, autoComplete: 'name' },
    { name: 'email' as const, label: 'Email', placeholder: 'Nhập email', icon: Mail, autoComplete: 'email' },
  ];

  const passwordFields = [
    {
      name: 'password' as const,
      label: 'Mật khẩu',
      placeholder: 'Tạo mật khẩu (tối thiểu 8 ký tự)',
      show: showPassword,
      toggle: setShowPassword,
      autoComplete: 'new-password',
    },
    {
      name: 'confirmPassword' as const,
      label: 'Xác nhận mật khẩu',
      placeholder: 'Nhập lại mật khẩu',
      show: showConfirmPassword,
      toggle: setShowConfirmPassword,
      autoComplete: 'new-password',
    },
  ];

  return (
    <FormCard
      panelTitle={
        <>
          Tạo tài khoản miễn phí,
          <br />
          nhận ưu đãi thành viên
        </>
      }
      pills={['Theo dõi đơn hàng', 'Tra cứu bảo hành', 'Giá riêng thành viên']}
      badge={null}
    >
      <div className={`${authForm.authHeader} mb-4`}>
        <h1 className={authForm.authTitle}>Tạo tài khoản</h1>
        <p className={authForm.authSubtitle}>
          Tham gia để khám phá linh kiện PC cao cấp
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${authForm.authForm} gap-2.5`}>

        {textFields.map(({ name, label, placeholder, icon: Icon, autoComplete }) => (
          <div key={name} className={`${authForm.formGroup} gap-1`}>
            <span className={authForm.fieldLabel}>{label}</span>
            <div
              className={`${authForm.inputWrapper} ${errors[name] ? authForm.inputWrapperError : ''}`}
            >
              <div className={authForm.inputIcon}>
                <Icon size={16} />
              </div>
              <input
                type={name === 'email' ? 'email' : 'text'}
                name={name}
                placeholder={placeholder}
                value={formData[name]}
                onChange={handleInputChange}
                className={authForm.input}
                autoComplete={autoComplete}
              />
            </div>
            {errors[name] && (
              <span className={authForm.errorMessage}>
                <X size={13} /> {errors[name]}
              </span>
            )}
          </div>
        ))}

        {passwordFields.map(({ name, label, placeholder, show, toggle, autoComplete }) => (
          <div key={name} className={`${authForm.formGroup} gap-1`}>
            <span className={authForm.fieldLabel}>{label}</span>
            <div
              className={`${authForm.inputWrapper} ${errors[name] ? authForm.inputWrapperError : ''}`}
            >
              <div className={authForm.inputIcon}>
                <Lock size={16} />
              </div>
              <input
                type={show ? 'text' : 'password'}
                name={name}
                placeholder={placeholder}
                value={formData[name]}
                onChange={handleInputChange}
                className={authForm.input}
                autoComplete={autoComplete}
              />
              <button
                type="button"
                onClick={() => toggle((v) => !v)}
                className={authForm.passwordToggle}
                tabIndex={-1}
                aria-label="Hiện/ẩn mật khẩu"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors[name] && (
              <span className={authForm.errorMessage}>
                <X size={13} /> {errors[name]}
              </span>
            )}
          </div>
        ))}

        <button type="submit" className={authForm.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className={authForm.loadingWrapper}>
              <span className={authForm.spinner} />
              Đang tạo tài khoản...
            </span>
          ) : (
            'Đăng ký'
          )}
        </button>

        <div className={authForm.authLinks}>
          <p className={authForm.createAccountText}>
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={authForm.linkBtn}
            >
              Đăng nhập
            </button>
          </p>
        </div>
      </form>

      {showOTPPopup && (
        <OTPPopup
          isOpen={showOTPPopup}
          onClose={handleCloseOTP}
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

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } } };
  return err.response?.data?.message ?? fallback;
}

export default SignUp;
