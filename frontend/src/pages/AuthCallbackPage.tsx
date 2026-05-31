import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { completeAuthSession } from '@/utils/completeAuthSession';

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [message, setMessage] = useState('Đang xác thực tài khoản Google...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      navigate(
        `/login?error=${error ?? 'google_failed'}`,
        { replace: true },
      );
      return;
    }

    const run = async () => {
      try {
        const accessToken = await authService.exchangeGoogleCode(code);
        sessionStorage.setItem(
          'loginSuccess',
          JSON.stringify({ provider: 'google', timestamp: Date.now() }),
        );
        await completeAuthSession(
          accessToken,
          login,
          navigate,
          'Đăng nhập Google thành công! Chào mừng bạn.',
        );
      } catch {
        setMessage('Không đổi được mã xác thực. Đang chuyển về đăng nhập...');
        setTimeout(
          () => navigate('/login?error=google_failed', { replace: true }),
          1200,
        );
      }
    };

    void run();
  }, [searchParams, navigate, login]);

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-6 h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-inverse-primary"
        role="status"
        aria-label="Đang tải"
      />
      <p className="text-lg font-semibold text-white">{message}</p>
      <p className="mt-2 max-w-xs text-sm text-white/55">
        Vui lòng không đóng cửa sổ trong giây lát
      </p>
    </div>
  );
};
