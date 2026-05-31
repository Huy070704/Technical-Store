import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { FormCard } from './FormCard';
import { AuthOAuthDivider } from './AuthOAuthDivider';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { getGoogleAuthErrorMessage } from '@/constants/googleAuth';
import { completeAuthSession } from '@/utils/completeAuthSession';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const googleError = searchParams.get('error');
    if (googleError) {
      const msg = getGoogleAuthErrorMessage(googleError);
      if (msg) setErrors({ general: msg });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const keys = ['lastRegisteredUser', 'lastResetUser'] as const;
    for (const key of keys) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { email?: string; timestamp?: number };
        if (Date.now() - (parsed.timestamp ?? 0) < 5 * 60 * 1000 && parsed.email) {
          setFormData((prev) => ({ ...prev, email: parsed.email! }));
        }
        sessionStorage.removeItem(key);
      } catch {
        sessionStorage.removeItem(key);
      }
    }
  }, []);

  const validateField = (name: string, value: string) => {
    if (name === 'email') {
      if (!value.trim()) return 'Vui lòng nhập email';
      if (!EMAIL_REGEX.test(value.trim())) return 'Email không hợp lệ';
      return '';
    }
    if (name === 'password') {
      if (!value) return 'Vui lòng nhập mật khẩu';
      if (value.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
      return '';
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsSubmitting(true);
    const email = formData.email.trim().toLowerCase();

    try {
      const accessToken = await authService.login({
        email,
        password: formData.password,
      });

      sessionStorage.setItem(
        'loginSuccess',
        JSON.stringify({ email, timestamp: Date.now() }),
      );

      await completeAuthSession(accessToken, login, navigate);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      let message = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';

      if (err.response?.status === 401) {
        message = 'Email hoặc mật khẩu không đúng.';
      } else if (err.response?.status === 429) {
        message = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
      } else if (!navigator.onLine) {
        message = 'Không có kết nối mạng.';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard>
      <button
        type="button"
        onClick={() => navigate('/')}
        className={authForm.backArrowBtn}
        aria-label="Về trang chủ"
      >
        <ArrowLeft size={20} />
      </button>

      <div className={authForm.authHeader}>
        <h1 className={authForm.authTitle}>Chào mừng trở lại!</h1>
        <p className={authForm.authSubtitle}>
          Đăng nhập để mua sắm linh kiện PC chính hãng
        </p>
      </div>

      <form onSubmit={handleSubmit} className={authForm.authForm}>
        {errors.general && (
          <div className={authForm.errorMessageCenter}>{errors.general}</div>
        )}

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

        <div className={authForm.formGroup}>
          <div
            className={`${authForm.inputWrapper} ${errors.password ? authForm.inputWrapperError : ''}`}
          >
            <div className={authForm.inputIcon}>
              <Lock size={20} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleInputChange}
              className={authForm.input}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={authForm.passwordToggle}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <span className={authForm.errorMessage}>{errors.password}</span>
          )}
        </div>

        <div className={authForm.formActionsRow}>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className={authForm.forgotPasswordLink}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button type="submit" className={authForm.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập bằng email'}
        </button>

        <AuthOAuthDivider mode="login" disabled={isSubmitting} />

        <div className={authForm.authLinks}>
          <p className={authForm.createAccountText}>
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className={authForm.linkBtn}
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </form>
    </FormCard>
  );
};

export default Login;
