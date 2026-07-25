import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface OTPPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
  error?: string;
}

const RESEND_SECONDS = 60;

export const OTPPopup = ({
  isOpen,
  onClose,
  onVerify,
  onResend,
  error,
}: OTPPopupProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setLocalError('');
      setOtp(['', '', '', '', '', '']);
      setCountdown(RESEND_SECONDS);
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value) || value.length > 1) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setLocalError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasted)) {
      setLocalError('Vui lòng dán mã 6 chữ số hợp lệ');
      return;
    }
    setOtp(pasted.split('').slice(0, 6));
    setLocalError('');
    inputRefs.current[5]?.focus();
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setLocalError('Vui lòng nhập đủ 6 chữ số');
      return;
    }
    setLocalError('');
    onVerify(otpString);
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(RESEND_SECONDS);
    onResend();
  };

  const displayError = localError || error;
  const mmss = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(
    countdown % 60,
  ).padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(e) => e.preventDefault()}
      role="presentation"
    >
      <div
        className="animate-fadeInUp relative w-full max-w-[440px] rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl max-[480px]:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2
            id="otp-title"
            className="m-0 text-xl font-bold tracking-[-0.01em] text-white"
          >
            Xác thực email
          </h2>
          <button
            type="button"
            className="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-slate-400 transition-colors hover:text-white"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-6 text-left text-sm leading-5 text-slate-400">
          Nhập mã 6 số đã được gửi tới email của bạn.
        </p>

        <div className="mb-5 flex justify-center gap-2.5">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`h-12 w-11 rounded-lg border bg-slate-800/80 text-center text-xl font-semibold tabular-nums text-white outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(183,0,17,0.3)] ${
                displayError ? 'border-primary' : 'border-slate-700/80'
              }`}
              aria-label={`Chữ số ${index + 1}`}
            />
          ))}
        </div>

        {displayError && (
          <div className="mb-4 rounded-xl border border-red-800/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300">
            {displayError}
          </div>
        )}

        <button
          type="button"
          className="w-full cursor-pointer rounded-lg border border-transparent bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleVerify}
          disabled={otp.some((d) => !d)}
        >
          Xác thực
        </button>

        <p className="mt-5 text-sm text-slate-400">
          Chưa nhận được mã?{' '}
          <button
            type="button"
            className="border-none bg-transparent p-0 font-semibold text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:text-slate-600 disabled:no-underline"
            onClick={handleResend}
            disabled={countdown > 0}
          >
            Gửi lại
          </button>{' '}
          {countdown > 0 && (
            <span className="tabular-nums text-slate-400">({mmss})</span>
          )}
        </p>
      </div>
    </div>
  );
};
