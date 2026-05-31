import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface OTPPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
  error?: string;
}

export const OTPPopup = ({
  isOpen,
  onClose,
  onVerify,
  onResend,
  error,
}: OTPPopupProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setLocalError('');
      setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

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

  const displayError = localError || error;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={(e) => e.preventDefault()}
      role="presentation"
    >
      <div
        className="relative w-[90%] max-w-[480px] rounded-xl bg-bg-card p-8 text-center shadow-lg max-[480px]:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="otp-title" className="m-0 flex-1 text-2xl text-on-surface">
            Xác thực email
          </h2>
          <button
            type="button"
            className="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-secondary hover:bg-surface-container-low"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-8 text-sm text-secondary">
          Nhập mã 6 số đã được gửi tới email của bạn.
        </p>

        <div className="mb-8 flex justify-center gap-3">
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
              className={`h-11 w-11 rounded-lg border-2 bg-surface-container-low text-center text-xl focus:border-primary focus:outline-none ${
                displayError ? 'border-error' : 'border-slate-border'
              }`}
              aria-label={`Chữ số ${index + 1}`}
            />
          ))}
        </div>

        {displayError && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error-container px-3 py-3 text-sm text-on-error-container">
            {displayError}
          </div>
        )}

        <button
          type="button"
          className="w-full rounded-lg bg-primary py-3 font-medium text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-bg-soft"
          onClick={handleVerify}
          disabled={otp.some((d) => !d)}
        >
          Xác thực
        </button>

        <div className="mt-6 text-sm text-secondary">
          <span>Chưa nhận được mã?</span>
          <button
            type="button"
            className="ml-2 border-none bg-transparent p-0 font-medium text-primary hover:underline"
            onClick={onResend}
          >
            Gửi lại
          </button>
        </div>
      </div>
    </div>
  );
};
