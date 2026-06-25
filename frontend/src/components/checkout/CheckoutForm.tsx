import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { OTPPopup } from '@/components/Login/OTPPopup';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin } from 'lucide-react';
import { useVietnamProvinces } from '@/hooks/useVietnamProvinces';
import {
  getDistrictsByProvince,
  getWardsByDistrict,
  validateAddress,
} from '@/services/vietnamProvinces';
import { cart } from '@/styles/cartClasses';
import { calcOrderPricing, formatVnd, getProductCategoryLabel } from '@/utils/cartFormat';
import {
  isValidVnPhone,
  normalizeVnPhone,
  vnPhoneErrorMessage,
} from '@/utils/phoneValidation';
import type { CartLineItem } from '@/types/cart';
import type { PaymentMethodType } from '@/types/order';

export interface CheckoutFormData {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  paymentMethod: PaymentMethodType;
  requireInvoice: boolean;
  guestOtp?: string;
}

interface CheckoutFormProps {
  cartLines: CartLineItem[];
  subtotal: number;
  isGuest: boolean;
  isProcessing: boolean;
  error: string | null;
  onPlaceOrder: (data: CheckoutFormData) => Promise<void>;
  onBackToCart: () => void;
}

const emptyForm: CheckoutFormData = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  ward: '',
  paymentMethod: 'COD',
  requireInvoice: true,
};

export const CheckoutForm = ({
  cartLines,
  subtotal,
  isGuest,
  isProcessing,
  error,
  onPlaceOrder,
  onBackToCart,
}: CheckoutFormProps) => {
  const { provinces, loading: provincesLoading, error: provincesError } =
    useVietnamProvinces();
  const [form, setForm] = useState<CheckoutFormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showOtp, setShowOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<CheckoutFormData | null>(
    null,
  );
  const [verifiedOtp, setVerifiedOtp] = useState<string | null>(null);

  const { user } = useAuth();
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');

  // Load authenticated user profile details to prefill the form
  useEffect(() => {
    if (!isGuest && user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
      }));
      if (user.address && user.addresses?.includes(user.address)) {
        setSelectedSavedAddress(user.address);
      }
    }
  }, [isGuest, user]);

  const pricing = calcOrderPricing(subtotal);

  const availableDistricts = useMemo(
    () => getDistrictsByProvince(provinces, form.city),
    [provinces, form.city],
  );

  const availableWards = useMemo(
    () => getWardsByDistrict(provinces, form.city, form.district),
    [provinces, form.city, form.district],
  );

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }
    if (!isValidVnPhone(form.phone)) {
      errors.phone = vnPhoneErrorMessage;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Email không hợp lệ';
    }

    const isUsingSavedAddress = selectedSavedAddress && selectedSavedAddress !== 'manual';

    if (isUsingSavedAddress) {
      if (!form.address.trim() || form.address.trim().length < 10) {
        errors.address = 'Địa chỉ không hợp lệ';
      }
    } else {
      if (!form.address.trim() || form.address.trim().length < 10) {
        errors.address = 'Địa chỉ phải có ít nhất 10 ký tự';
      }
      if (!form.city.trim()) {
        errors.city = 'Vui lòng chọn Tỉnh/Thành phố';
      }
      if (!form.district.trim()) {
        errors.district = 'Vui lòng chọn Quận/Huyện';
      }
      if (!form.ward.trim()) {
        errors.ward = 'Vui lòng chọn Phường/Xã';
      } else if (form.city && form.district) {
        const addrCheck = validateAddress(
          provinces,
          form.city,
          form.district,
          form.ward,
        );
        if (!addrCheck.valid) {
          errors.ward = addrCheck.message;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProvinceChange = (province: string) => {
    setForm((prev) => ({ ...prev, city: province, district: '', ward: '' }));
    setFieldErrors((prev) => ({ ...prev, city: '', district: '', ward: '' }));
  };

  const handleDistrictChange = (district: string) => {
    setForm((prev) => ({ ...prev, district, ward: '' }));
    setFieldErrors((prev) => ({ ...prev, district: '', ward: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: CheckoutFormData = {
      ...form,
      email: form.email.trim().toLowerCase(),
      phone: normalizeVnPhone(form.phone),
      guestOtp: verifiedOtp ?? undefined,
    };

    if (isGuest && !otpVerified) {
      setPendingSubmit(payload);
      setShowOtp(true);
      setOtpError('');
      try {
        await authService.sendOtp(payload.email);
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (err instanceof Error ? err.message : null)
          ?? 'Không gửi được OTP. Vui lòng thử lại.';
        setOtpError(msg);
      }
      return;
    }

    await onPlaceOrder(payload);
  };

  const handleVerifyOtp = async (otp: string) => {
    const email = (pendingSubmit?.email ?? form.email).trim().toLowerCase();
    try {
      const ok = await authService.verifyOtp(email, otp);
      if (!ok) {
        setOtpError('Mã OTP không đúng hoặc đã hết hạn');
        return;
      }
      setOtpVerified(true);
      setVerifiedOtp(otp);
      setShowOtp(false);
      setOtpError('');
      if (pendingSubmit) {
        await onPlaceOrder({
          ...pendingSubmit,
          phone: normalizeVnPhone(pendingSubmit.phone),
          guestOtp: otp,
        });
        setPendingSubmit(null);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : null)
        ?? 'Xác thực OTP thất bại. Vui lòng thử lại.';
      setOtpError(msg);
    }
  };

  const updateField = (name: keyof CheckoutFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <div className={cart.checkoutContent}>
      <div className={cart.orderDetails}>
        <div className={cart.orderItemsCard}>
          <h2 className="mb-4 text-headline-lg text-on-surface">Đơn hàng</h2>
          {cartLines.map((line) => {
            const imageUrl = line.product.images?.[0]?.url ?? '/img/pc.png';
            return (
              <div key={line.id} className={cart.orderItemRow}>
                {/* Column 1: Image */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-border/50 bg-surface-container-low p-1.5">
                  <img
                    src={imageUrl}
                    alt={line.product.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/img/pc.png';
                    }}
                  />
                </div>
                
                {/* Column 2: Info */}
                <div className="flex flex-col justify-between py-0.5">
                  <div className="text-left">
                    <h3 className="line-clamp-2 text-body-sm font-semibold text-on-surface">
                      {line.product.name}
                    </h3>
                    <p className="mt-0.5 text-label-xs text-secondary">
                      {getProductCategoryLabel(line.product.category)}
                    </p>
                  </div>
                  <p className="text-label-xs font-medium text-secondary text-left">
                    {line.quantity} × {formatVnd(line.product.price)}
                  </p>
                </div>

                {/* Column 3: Total */}
                <div className="flex items-center justify-end text-right text-body-md font-bold text-on-surface">
                  {formatVnd(line.product.price * line.quantity)}
                </div>
              </div>
            );
          })}
        </div>

        <form id="checkout-form" onSubmit={handleSubmit} className={cart.shippingForm}>
          <h2 className={cart.shippingFormTitle}>Thông tin khách hàng</h2>

          {isGuest && (
            <div className={cart.guestNotification}>
              <div className={cart.guestNotificationText}>
                Bạn đang đặt hàng dưới dạng khách. Vui lòng xác thực email bằng
                OTP trước khi đặt hàng.
              </div>
            </div>
          )}

          {(
            [
              ['fullName', 'Họ tên *', 'text'],
              ['phone', 'Số điện thoại *', 'tel'],
              ['email', 'Email *', 'email'],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name} className={cart.formGroup}>
              <label htmlFor={name} className={cart.formLabel}>
                {label}
              </label>
              <input
                id={name}
                type={type}
                className={cart.formInput}
                value={form[name]}
                onChange={(e) => updateField(name, e.target.value)}
              />
              {fieldErrors[name] && (
                <p className={cart.fieldError}>{fieldErrors[name]}</p>
              )}
            </div>
          ))}

          <div className={cart.addressSection}>
            <h3 className={cart.addressSectionTitle}>Địa chỉ giao hàng</h3>

            {/* Saved Addresses List for Logged-in Users */}
            {user?.addresses && user.addresses.length > 0 && (
              <div className="mb-5 flex flex-col gap-2.5">
                <label className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                  Chọn địa chỉ giao hàng đã lưu
                </label>
                <div className="flex flex-col gap-2">
                  {user.addresses.map((addr) => {
                    const isSelected = selectedSavedAddress === addr;
                    return (
                      <label
                        key={addr}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/40 select-none ${
                          isSelected
                            ? 'border-primary bg-primary-light/5 shadow-sm'
                            : 'border-slate-border bg-bg-card'
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSavedAddress(addr);
                            setForm((prev) => ({
                              ...prev,
                              address: addr,
                              city: '',
                              district: '',
                              ward: '',
                            }));
                            setFieldErrors((prev) => ({
                              ...prev,
                              address: '',
                              city: '',
                              district: '',
                              ward: '',
                            }));
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-slate-border bg-bg-card'
                          }`}
                        >
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-body-sm font-medium text-on-surface text-left">
                          {addr}
                          {user.address === addr && (
                            <span className="ml-2 inline-flex items-center rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              Mặc định
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/40 select-none ${
                      selectedSavedAddress === 'manual' || !selectedSavedAddress
                        ? 'border-primary bg-primary-light/5 shadow-sm'
                        : 'border-slate-border bg-bg-card'
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value="manual"
                      checked={selectedSavedAddress === 'manual' || !selectedSavedAddress}
                      onChange={() => {
                        setSelectedSavedAddress('manual');
                        setForm((prev) => ({
                          ...prev,
                          address: '',
                          city: '',
                          district: '',
                          ward: '',
                        }));
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        selectedSavedAddress === 'manual' || !selectedSavedAddress
                          ? 'border-primary bg-primary'
                          : 'border-slate-border bg-bg-card'
                      }`}
                    >
                      {(selectedSavedAddress === 'manual' || !selectedSavedAddress) && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-body-sm font-bold text-on-surface text-left">
                      Nhập địa chỉ mới
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Render Address Input Fields */}
            {(!selectedSavedAddress || selectedSavedAddress === 'manual') ? (
              <>
                <div className={cart.formGroup}>
                  <label htmlFor="address" className={cart.formLabel}>
                    Số nhà, tên đường *
                  </label>
                  <input
                    id="address"
                    type="text"
                    className={cart.formInput}
                    placeholder="Số nhà, tên đường"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                  {fieldErrors.address && (
                    <p className={cart.fieldError}>{fieldErrors.address}</p>
                  )}
                </div>

                <div className={cart.formRow}>
                  <div className={cart.formGroup}>
                    <label htmlFor="city" className={cart.formLabel}>
                      Tỉnh/Thành phố *
                    </label>
                    <select
                      id="city"
                      className={cart.formSelect}
                      value={form.city}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={provincesLoading}
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      {Object.keys(provinces).map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                    {provincesLoading && (
                      <p className={cart.formHint}>Đang tải dữ liệu...</p>
                    )}
                    {provincesError && (
                      <p className={`${cart.formHint} text-error`}>{provincesError}</p>
                    )}
                    {fieldErrors.city && (
                      <p className={cart.fieldError}>{fieldErrors.city}</p>
                    )}
                  </div>

                  <div className={cart.formGroup}>
                    <label htmlFor="district" className={cart.formLabel}>
                      Quận/Huyện *
                    </label>
                    <select
                      id="district"
                      className={cart.formSelect}
                      value={form.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={!form.city || availableDistricts.length === 0}
                    >
                      <option value="">Chọn quận/huyện</option>
                      {availableDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.district && (
                      <p className={cart.fieldError}>{fieldErrors.district}</p>
                    )}
                  </div>
                </div>

                <div className={cart.formGroup}>
                  <label htmlFor="ward" className={cart.formLabel}>
                    Phường/Xã *
                  </label>
                  <select
                    id="ward"
                    className={cart.formSelect}
                    value={form.ward}
                    onChange={(e) => updateField('ward', e.target.value)}
                    disabled={!form.district || availableWards.length === 0}
                  >
                    <option value="">Chọn phường/xã</option>
                    {availableWards.map((ward) => (
                      <option key={ward} value={ward}>
                        {ward}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.ward && (
                    <p className={cart.fieldError}>{fieldErrors.ward}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary-light/5 p-4 text-left">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                    Giao hàng đến địa chỉ đã chọn
                  </span>
                  <span className="text-body-sm font-semibold text-on-surface">
                    {form.address}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      <aside className={cart.orderSummary}>
        <h2 className={cart.orderSummaryTitle}>Tóm tắt</h2>
        <div className={cart.summaryDetails}>
          <div className={cart.summaryRow}>
            <span>Tạm tính</span>
            <span>{formatVnd(pricing.subtotal)}</span>
          </div>
          <div className={cart.summaryRow}>
            <span>Phí ship</span>
            <span>
              {pricing.shippingFee === 0
                ? 'Miễn phí'
                : formatVnd(pricing.shippingFee)}
            </span>
          </div>
          <div className={cart.summaryRow}>
            <span>VAT (10%)</span>
            <span>{formatVnd(pricing.vatAmount)}</span>
          </div>
          <div className={cart.summaryTotal}>
            <span>Tổng</span>
            <span>{formatVnd(pricing.total)}</span>
          </div>
        </div>

        <div className="mb-6 border-b border-slate-border/50 pb-6">
          <h3 className="mb-4 text-body-md font-semibold text-on-surface">
            Phương thức thanh toán
          </h3>
          <div className="flex flex-col gap-3">
            
            {/* COD Option */}
            <label
              className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all hover:border-primary/40 active:scale-[0.99] select-none ${
                form.paymentMethod === 'COD'
                  ? 'border-primary bg-primary-light/5 shadow-[0_0_0_1px_rgba(183,0,17,0.1)]'
                  : 'border-slate-border bg-bg-card'
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="COD"
                checked={form.paymentMethod === 'COD'}
                onChange={() => updateField('paymentMethod', 'COD')}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  form.paymentMethod === 'COD'
                    ? 'border-primary bg-primary'
                    : 'border-slate-border bg-bg-card'
                }`}
              >
                {form.paymentMethod === 'COD' && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-body-sm font-bold text-on-surface">
                  COD (Thanh toán khi nhận hàng)
                </span>
                <span className="text-label-xs text-secondary">
                  Thanh toán bằng tiền mặt khi nhận hàng
                </span>
              </div>
            </label>

            {/* PayOS Option */}
            <label
              className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all hover:border-primary/40 active:scale-[0.99] select-none ${
                form.paymentMethod === 'ONLINE'
                  ? 'border-primary bg-primary-light/5 shadow-[0_0_0_1px_rgba(183,0,17,0.1)]'
                  : 'border-slate-border bg-bg-card'
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="ONLINE"
                checked={form.paymentMethod === 'ONLINE'}
                onChange={() => updateField('paymentMethod', 'ONLINE')}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  form.paymentMethod === 'ONLINE'
                    ? 'border-primary bg-primary'
                    : 'border-slate-border bg-bg-card'
                }`}
              >
                {form.paymentMethod === 'ONLINE' && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-body-sm font-bold text-on-surface">
                  PayOS (Chuyển khoản QR)
                </span>
                <span className="text-label-xs text-secondary">
                  Quét mã QR nhanh chóng qua App ngân hàng
                </span>
              </div>
            </label>

          </div>
        </div>

        {error && <div className={cart.errorMessage}>{error}</div>}

        <button
          type="submit"
          form="checkout-form"
          disabled={isProcessing || cartLines.length === 0}
          className={`${cart.placeOrderButton} ${
            form.paymentMethod === 'ONLINE' ? cart.payosButton : cart.codButton
          }`}
        >
          {isProcessing
            ? 'Đang xử lý...'
            : form.paymentMethod === 'ONLINE'
              ? `Thanh toán PayOS • ${formatVnd(pricing.total)}`
              : `Đặt hàng COD • ${formatVnd(pricing.total)}`}
        </button>

        <button
          type="button"
          className={`${cart.continueShoppingBtn} mt-3`}
          onClick={onBackToCart}
        >
          Quay lại giỏ hàng
        </button>
      </aside>

      <OTPPopup
        isOpen={showOtp}
        onClose={() => {
          setShowOtp(false);
          setOtpError('');
          setPendingSubmit(null);
        }}
        onVerify={handleVerifyOtp}
        onResend={async () => {
          try {
            const email = (pendingSubmit?.email ?? form.email).trim().toLowerCase();
            await authService.sendOtp(email);
            setOtpError('');
          } catch (err) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? 'Không gửi được OTP. Vui lòng thử lại sau.';
            setOtpError(msg);
          }
        }}
        error={otpError}
      />
    </div>
  );
};
