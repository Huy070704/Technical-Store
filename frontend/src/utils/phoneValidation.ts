/** Số điện thoại VN: 10 chữ số, bắt đầu 0 + đầu số 3/5/7/8/9 */
export const VN_PHONE_REGEX = /^0(3|5|7|8|9)\d{8}$/;

export const normalizeVnPhone = (phone: string): string =>
  String(phone ?? '').replace(/\D/g, '');

export const isValidVnPhone = (phone: string): boolean =>
  VN_PHONE_REGEX.test(normalizeVnPhone(phone));

export const vnPhoneErrorMessage =
  'Số điện thoại không hợp lệ (VD: 0912345678)';
