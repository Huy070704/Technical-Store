/**
 * Tailwind classes dùng chung cho form đăng nhập / đăng ký / quên mật khẩu.
 * Light theme theo "Retail Operations Pro" — form trắng, viền slate #CBD5E1,
 * focus ring đỏ #b70011, chữ tối #0b1c30, nút đỏ thương hiệu.
 */
export const authForm = {
  // ── Header trên form ────────────────────────────────────────────────
  backArrowBtn:
    'inline-flex items-center gap-1.5 self-start border-none bg-transparent p-0 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100',
  authHeader: 'mb-6',
  authTitle:
    'mb-2 text-3xl font-bold leading-tight tracking-[-0.02em] text-white md:text-3.5xl',
  authTitleGradient:
    'mb-2 text-3xl font-bold leading-tight tracking-[-0.02em] text-white md:text-3.5xl',
  authSubtitle: 'text-base leading-6 text-slate-400',

  // ── Form + field ────────────────────────────────────────────────────
  authForm: 'flex flex-col gap-4',
  formGroup: 'flex flex-col gap-1.5',
  fieldLabel:
    'text-sm font-semibold tracking-[0.01em] text-slate-200',
  inputWrapper:
    'flex items-center gap-2.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3.5 py-2.5 transition-all focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(183,0,17,0.3)]',
  inputWrapperError:
    'border-primary focus-within:border-primary',
  inputIcon: 'flex shrink-0 items-center justify-center text-slate-400',
  input:
    'w-full flex-1 border-none bg-transparent p-0 text-base leading-6 text-white outline-none placeholder:text-slate-500',
  passwordToggle:
    'flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-slate-400 transition-colors hover:text-slate-200',
  errorMessage:
    'flex items-center gap-1 text-xs leading-4 text-primary',

  // ── Nút chính ───────────────────────────────────────────────────────
  submitBtn:
    'mt-1 h-12 cursor-pointer rounded-lg border border-transparent bg-primary text-base font-semibold tracking-[0.01em] text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60',

  // ── Hàng phụ (ghi nhớ / quên mật khẩu) ──────────────────────────────
  formActionsRow: 'flex items-center justify-between',
  rememberMeLabel:
    'flex cursor-pointer select-none items-center gap-2 text-sm text-slate-300',
  rememberMeCheckbox:
    'h-[16px] w-[16px] cursor-pointer accent-primary',
  forgotPasswordLink:
    'cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-slate-200 transition-colors hover:text-white hover:underline',

  // ── Liên kết dưới form ──────────────────────────────────────────────
  authLinks: 'text-center',
  createAccountText: 'm-0 text-center text-sm text-slate-400',
  linkBtn:
    'inline cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-primary transition-colors hover:text-primary-hover',

  // ── Trạng thái loading ──────────────────────────────────────────────
  loadingWrapper: 'flex items-center justify-center gap-2',
  spinner:
    'h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white',
};
