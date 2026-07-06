import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react';
import { FormCard } from './FormCard';
import { authForm } from '@/styles/authFormClasses';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { completeAuthSession } from '@/utils/completeAuthSession';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    // 1. Prefill email from rememberedEmail if exists
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, identifier: rememberedEmail }));
      setRememberMe(true);
    }

    // 2. Prefill email from recent registration/reset (takes priority)
    const keys = ['lastRegisteredUser', 'lastResetUser'] as const;
    for (const key of keys) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { email?: string; timestamp?: number };
        if (Date.now() - (parsed.timestamp ?? 0) < 5 * 60 * 1000 && parsed.email) {
          setFormData((prev) => ({ ...prev, identifier: parsed.email! }));
        }
        sessionStorage.removeItem(key);
      } catch {
        sessionStorage.removeItem(key);
      }
    }
  }, []);

  const validateField = (name: string, value: string) => {
    if (name === 'identifier') {
      if (!value.trim()) return 'Vui lòng nhập email hoặc tên đăng nhập';
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

    const identifierError = validateField('identifier', formData.identifier);
    const passwordError = validateField('password', formData.password);
    if (identifierError || passwordError) {
      setErrors({ identifier: identifierError, password: passwordError });
      return;
    }

    setIsSubmitting(true);
    const identifier = formData.identifier.trim();

    try {
      const accessToken = await authService.login({
        identifier,
        password: formData.password,
      });

      sessionStorage.setItem(
        'loginSuccess',
        JSON.stringify({ identifier, timestamp: Date.now() }),
      );

      await completeAuthSession(accessToken, login, navigate, 'Chào mừng bạn trở lại!', rememberMe);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      let message = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';

      if (err.response?.status === 401) {
        message = 'Email/tên đăng nhập hoặc mật khẩu không đúng.';
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
            className={`${authForm.inputWrapper} ${errors.identifier ? authForm.inputWrapperError : ''}`}
          >
            <div className={authForm.inputIcon}>
              <User size={20} />
            </div>
            <input
              type="text"
              name="identifier"
              placeholder="Email hoặc tên đăng nhập"
              value={formData.identifier}
              onChange={handleInputChange}
              className={authForm.input}
              autoComplete="username"
            />
          </div>
          {errors.identifier && (
            <span className={authForm.errorMessage}>{errors.identifier}</span>
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
          <label className={authForm.rememberMeLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={authForm.rememberMeCheckbox}
              id="rememberMe"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className={authForm.forgotPasswordLink}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button type="submit" className={authForm.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>



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
