import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { FormCard } from './FormCard';
import { AuthOAuthDivider } from './AuthOAuthDivider';
import { OTPPopup } from './OTPPopup';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { completeAuthSession } from '@/utils/completeAuthSession';

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
        if (!value.trim()) return 'Vui lòng nhập họ tên';
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
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: '' }));
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
        phone: email,
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

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!pendingEmail) {
      setErrors({ general: 'Thiếu thông tin đăng ký' });
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
      setErrors({
        general: err.response?.data?.message ?? 'Xác thực OTP thất bại. Thử gửi lại mã mới.',
      });
    }
  };

  const handleResendOTP = async () => {
    const email = pendingEmail ?? formData.email.trim().toLowerCase();
    if (!email) {
      setErrors({ general: 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.' });
      setShowOTPPopup(false);
      clearPending();
      return;
    }

    try {
      await authService.resendOtp(email);
      savePending(email);
      setErrors({ general: '' });
    } catch (error: unknown) {
      setErrors({
        general: getErrorMessage(error, 'Không gửi lại được OTP. Vui lòng thử lại.'),
      });
    }
  };

  const handleCloseOTP = () => {
    setShowOTPPopup(false);
    setPendingEmail(null);
    clearPending();
  };

  return (
    <FormCard>
      <div className={authForm.authHeader}>
        <h1 className={authForm.authTitleGradient}>Tạo tài khoản</h1>
        <p className={authForm.authSubtitle}>
          Tham gia để khám phá linh kiện PC cao cấp
        </p>
      </div>

      <form onSubmit={handleSubmit} className={authForm.authForm}>
        {errors.general && (
          <div className={authForm.errorMessage}>
            <X className="inline h-4 w-4" /> {errors.general}
          </div>
        )}

        {(['name', 'email'] as const).map((field) => (
          <div key={field} className={authForm.formGroup}>
            <div className={authForm.inputWrapperSignUp}>
              <div className={authForm.inputIconSignUp}>
                {field === 'name' ? (
                  <User className={authForm.iconSvg} size={18} />
                ) : (
                  <Mail className={authForm.iconSvg} size={18} />
                )}
              </div>
              <input
                type={field === 'email' ? 'email' : 'text'}
                name={field}
                placeholder={field === 'name' ? 'Họ và tên' : 'Nhập email'}
                value={formData[field]}
                onChange={handleInputChange}
                className={`${authForm.inputSignUp} ${errors[field] ? authForm.inputSignUpError : ''}`}
                autoComplete={field === 'email' ? 'email' : 'name'}
              />
            </div>
            {errors[field] && (
              <div className={authForm.errorMessage}>
                <X className="inline h-4 w-4" /> {errors[field]}
              </div>
            )}
          </div>
        ))}

        {(['password', 'confirmPassword'] as const).map((field) => {
          const show = field === 'password' ? showPassword : showConfirmPassword;
          const toggle = field === 'password' ? setShowPassword : setShowConfirmPassword;
          return (
            <div key={field} className={authForm.formGroup}>
              <div className={authForm.inputWrapperSignUp}>
                <div className={authForm.inputIconSignUp}>
                  <Lock className={authForm.iconSvg} size={18} />
                </div>
                <input
                  type={show ? 'text' : 'password'}
                  name={field}
                  placeholder={
                    field === 'password' ? 'Tạo mật khẩu' : 'Xác nhận mật khẩu'
                  }
                  value={formData[field]}
                  onChange={handleInputChange}
                  className={`${authForm.inputSignUp} ${errors[field] ? authForm.inputSignUpError : ''}`}
                />
                <button
                  type="button"
                  onClick={() => toggle((v) => !v)}
                  className={authForm.passwordToggleSignUp}
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors[field] && (
                <div className={authForm.errorMessage}>
                  <X className="inline h-4 w-4" /> {errors[field]}
                </div>
              )}
            </div>
          );
        })}

        <button type="submit" className={authForm.signUpSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className={authForm.loadingWrapper}>
              <span className={authForm.spinner} />
              Đang tạo tài khoản...
            </span>
          ) : (
            'ĐĂNG KÝ BẰNG EMAIL'
          )}
        </button>

        <AuthOAuthDivider mode="signup" disabled={isSubmitting} />

        <div className={authForm.authLinksSignUp}>
          <p className={authForm.signInText}>
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={authForm.signInLink}
            >
              ĐĂNG NHẬP
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
          error={errors.general}
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
