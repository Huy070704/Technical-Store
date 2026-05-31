/** Query `?error=` từ redirect backend Google OAuth */
export const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_failed: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
  account_blocked: 'Tài khoản không thể đăng nhập. Liên hệ bộ phận hỗ trợ.',
};

export const getGoogleAuthErrorMessage = (code: string | null): string | null =>
  code ? (GOOGLE_AUTH_ERROR_MESSAGES[code] ?? 'Xác thực Google không thành công.') : null;
