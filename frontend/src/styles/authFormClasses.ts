/** Tailwind classes dùng chung cho form đăng nhập / đăng ký */
export const authForm = {
  backArrowBtn:
    'absolute top-6 left-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white hover:-translate-x-0.5 hover:shadow-lg max-md:top-4 max-md:left-4 max-md:h-10 max-md:w-10',
  authHeader: 'mb-3 text-center md:mb-4',
  authTitle:
    'mb-1 text-xl font-bold leading-tight text-white md:text-2xl',
  authTitleGradient:
    'mb-1 bg-gradient-to-br from-primary to-primary-container bg-clip-text text-xl font-bold leading-tight text-transparent md:text-2xl',
  authSubtitle: 'text-xs text-white/70 md:text-sm',
  authForm: 'flex flex-col gap-2.5 md:gap-3',
  formGroup: 'relative flex flex-col gap-1',
  inputWrapper:
    'relative flex h-11 items-center rounded-lg border border-transparent bg-white transition-all',
  inputWrapperError: 'border-red-500 bg-red-500/5',
  inputIcon: 'flex w-10 shrink-0 items-center justify-center text-black',
  input:
    'flex-1 border-none bg-transparent py-0 pl-0 pr-3 text-sm text-black outline-none placeholder:text-black/50',
  inputSignUp:
    'h-11 w-full rounded-lg border border-primary/20 bg-white pl-10 pr-10 text-sm text-black transition-all placeholder:text-black/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
  inputSignUpError: 'border-red-500 bg-red-500/5',
  inputIconSignUp:
    'absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-black/50',
  passwordToggle:
    'absolute right-4 z-[3] flex h-6 w-6 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-primary/70 transition-colors hover:text-primary',
  errorMessage: 'pl-2 text-left text-sm text-red-400',
  errorMessageCenter: 'mb-4 text-center text-sm text-red-400',
  submitBtn:
    'h-11 cursor-pointer rounded-lg border-none bg-gradient-to-br from-primary to-primary-container text-sm font-medium text-on-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
  formActionsRow: '-mt-1 flex w-full items-center justify-end',
  forgotPasswordLink:
    'inline-block w-fit cursor-pointer border-none bg-transparent p-0 text-right text-sm font-medium text-white/90 transition-opacity hover:opacity-85',
  authLinks: 'mt-1 flex justify-center',
  createAccountText: 'm-0 text-sm text-white/70',
  linkBtn:
    'inline cursor-pointer border-none bg-transparent p-0 font-semibold text-inverse-primary transition-colors hover:text-white',
  inputWrapperSignUp: 'relative z-[2]',
  iconSvg: 'h-[18px] w-[18px] text-black/50',
  passwordToggleSignUp:
    'absolute right-6 top-1/2 z-[2] flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-black/50 transition-colors hover:text-primary',
  signUpSubmit:
    'h-11 w-full cursor-pointer rounded-lg border-none bg-gradient-to-br from-primary to-primary-container text-sm font-semibold uppercase tracking-wide text-on-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70',
  loadingWrapper: 'flex items-center justify-center gap-2',
  spinner:
    'h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white',
  authLinksSignUp: 'mt-2 flex flex-col gap-1 text-center',
  signInText: 'm-0 text-center text-xs font-medium text-white/65',
  signInLink:
    'cursor-pointer border-none bg-transparent text-xs font-semibold text-inverse-primary underline transition-colors hover:text-white',
  successBox:
    'mt-8 rounded-xl border border-tertiary/30 bg-tertiary-fixed/20 p-6 text-center text-on-surface',
  successTitle: 'mb-2 text-lg font-bold text-tertiary',
  successBtn:
    'mt-4 cursor-pointer rounded-lg border-none bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover',
  oauthDivider: 'relative flex items-center gap-2.5 py-0.5',
  oauthDividerLine: 'h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent',
  oauthDividerText:
    'shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45',
  googleBtn:
    'group relative flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-lg border border-white/15 bg-white/95 text-sm font-semibold text-on-surface shadow-md transition-all duration-200 hover:border-white/30 hover:bg-white hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-primary disabled:cursor-not-allowed disabled:opacity-60',
  googleBtnGlow:
    'pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100',
};
