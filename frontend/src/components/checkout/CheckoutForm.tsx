import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { OTPPopup } from '@/components/Login/OTPPopup';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, User, Mail, Phone, CreditCard, Check, Truck, ArrowLeft, Receipt, ShieldAlert } from 'lucide-react';
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
      const defaultAddress = user.address || '';
      const hasSavedAddresses = user.addresses && user.addresses.length > 0;
      const isDefaultInList = defaultAddress && user.addresses?.includes(defaultAddress);

      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || defaultAddress || (hasSavedAddresses ? user.addresses![0] : '') || '',
      }));

      if (isDefaultInList) {
        setSelectedSavedAddress(defaultAddress);
      } else if (hasSavedAddresses) {
        setSelectedSavedAddress(user.addresses![0]);
      } else {
        setSelectedSavedAddress('manual');
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
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 py-10 font-sans text-zinc-800 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
      <div className="flex flex-col gap-8 w-full">
        {/* Order Items Card */}
        <div className="border border-zinc-200/80 bg-white rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <h2 className="mb-6 font-outfit font-bold text-xl md:text-2xl text-zinc-900 tracking-tight flex items-center gap-2.5 pb-4 border-b border-zinc-100">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Đơn hàng của bạn</span>
          </h2>
          <div className="flex flex-col divide-y divide-zinc-100">
            {cartLines.map((line) => {
              const imageUrl = line.product.images?.[0]?.url ?? '/img/pc.png';
              return (
                <div key={line.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-start md:items-center">
                  {/* Column 1: Image */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 overflow-hidden transition-transform duration-300 hover:scale-[1.03]">
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
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left">
                    <div>
                      <h3 className="line-clamp-2 font-outfit font-medium text-sm text-zinc-800 leading-snug hover:text-primary transition-colors text-left">
                        {line.product.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-left">
                        {getProductCategoryLabel(line.product.category)}
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-zinc-500 text-left">
                      {line.quantity} × <span className="font-outfit tabular-nums text-zinc-700">{formatVnd(line.product.price)}</span>
                    </p>
                  </div>

                  {/* Column 3: Total */}
                  <div className="flex items-center justify-end text-right font-outfit tabular-nums font-bold text-sm md:text-base text-zinc-900 pl-2">
                    {formatVnd(line.product.price * line.quantity)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Shipping Info form */}
        <form id="checkout-form" onSubmit={handleSubmit} className="border border-zinc-200/80 bg-white rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-left flex flex-col gap-6">
          <div>
            <h2 className="font-outfit font-bold text-xl md:text-2xl text-zinc-900 tracking-tight flex items-center gap-2.5 pb-4 border-b border-zinc-100">
              <User className="h-5 w-5 text-primary" />
              <span>Thông tin khách hàng</span>
            </h2>
          </div>

          {isGuest && (
            <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left items-start">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
              <div className="flex-1 text-sm text-zinc-800 leading-relaxed font-medium">
                Bạn đang đặt hàng dưới dạng khách. Vui lòng xác thực email bằng
                OTP trước khi đặt hàng.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>Họ tên *</span>
              </label>
              <input
                id="fullName"
                type="text"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Nguyễn Văn A"
              />
              {fieldErrors.fullName && (
                <p className="text-xs font-medium text-error mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-400" />
                <span>Số điện thoại *</span>
              </label>
              <input
                id="phone"
                type="tel"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="0901234567"
              />
              {fieldErrors.phone && (
                <p className="text-xs font-medium text-error mt-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              <span>Email *</span>
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="example@domain.com"
            />
            {fieldErrors.email && (
              <p className="text-xs font-medium text-error mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-zinc-100 flex flex-col gap-6">
            <div>
              <h3 className="font-outfit font-bold text-xl text-zinc-900 tracking-tight flex items-center gap-2.5 pb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Địa chỉ giao hàng</span>
              </h3>
            </div>

            {/* Saved Addresses List for Logged-in Users */}
            {user?.addresses && user.addresses.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Chọn địa chỉ giao hàng đã lưu
                </label>
                <div className="flex flex-col gap-3">
                  {user.addresses.map((addr) => {
                    const isSelected = selectedSavedAddress === addr;
                    return (
                      <label
                        key={addr}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 select-none hover:border-zinc-300 active:scale-[0.99] ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                            : 'border-zinc-200 bg-white'
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
                        <div className="flex items-center gap-3 text-left">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="font-outfit text-sm font-medium text-zinc-800">
                            {addr}
                            {user.address === addr && (
                              <span className="ml-2.5 inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                Mặc định
                              </span>
                            )}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                  
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 select-none hover:border-zinc-300 active:scale-[0.99] ${
                      selectedSavedAddress === 'manual' || !selectedSavedAddress
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                        : 'border-zinc-200 bg-white'
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
                    <div className="flex items-center gap-3 text-left">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          selectedSavedAddress === 'manual' || !selectedSavedAddress
                            ? 'border-primary bg-primary text-white'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {(selectedSavedAddress === 'manual' || !selectedSavedAddress) && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </div>
                      <span className="font-outfit text-sm font-bold text-zinc-800">
                        Nhập địa chỉ mới
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Render Address Input Fields */}
            {(!selectedSavedAddress || selectedSavedAddress === 'manual') ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="address" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Số nhà, tên đường *
                  </label>
                  <input
                    id="address"
                    type="text"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans"
                    placeholder="Ví dụ: 123 Đường Trần Hưng Đạo"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                  {fieldErrors.address && (
                    <p className="text-xs font-medium text-error mt-1">{fieldErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="city" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Tỉnh/Thành phố *
                    </label>
                    <div className="relative">
                      <select
                        id="city"
                        className="w-full rounded-xl border border-zinc-200 bg-white pl-4 pr-10 py-3 text-sm text-zinc-800 transition-all hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 appearance-none text-left"
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
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                    {provincesLoading && (
                      <p className="text-[11px] text-zinc-400 italic">Đang tải dữ liệu...</p>
                    )}
                    {provincesError && (
                      <p className="text-[11px] text-error italic">{provincesError}</p>
                    )}
                    {fieldErrors.city && (
                      <p className="text-xs font-medium text-error mt-1">{fieldErrors.city}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="district" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Quận/Huyện *
                    </label>
                    <div className="relative">
                      <select
                        id="district"
                        className="w-full rounded-xl border border-zinc-200 bg-white pl-4 pr-10 py-3 text-sm text-zinc-800 transition-all hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 appearance-none text-left"
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
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                    {fieldErrors.district && (
                      <p className="text-xs font-medium text-error mt-1">{fieldErrors.district}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ward" className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Phường/Xã *
                  </label>
                  <div className="relative">
                    <select
                      id="ward"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-4 pr-10 py-3 text-sm text-zinc-800 transition-all hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 font-sans disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 appearance-none text-left"
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                  {fieldErrors.ward && (
                    <p className="text-xs font-medium text-error mt-1">{fieldErrors.ward}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left items-start shadow-sm">
                <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Giao hàng đến địa chỉ đã chọn
                  </span>
                  <span className="font-outfit text-sm font-semibold text-zinc-800">
                    {form.address}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right Column: Order Summary & Payment Options */}
      <aside className="lg:sticky lg:top-24 border border-zinc-200/80 bg-white rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col w-full">
        <h2 className="font-outfit font-bold text-xl text-zinc-900 tracking-tight mb-6 pb-4 border-b border-zinc-100 flex items-center gap-2 justify-start">
          <Receipt className="h-5 w-5 text-primary" />
          <span>Tóm tắt thanh toán</span>
        </h2>
        <div className="flex flex-col mb-6">
          <div className="flex justify-between items-center text-sm text-zinc-500 mb-3.5">
            <span className="font-outfit font-medium">Tạm tính</span>
            <span className="font-outfit tabular-nums font-semibold text-zinc-800">{formatVnd(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-zinc-500 mb-3.5">
            <span className="font-outfit font-medium">Phí giao hàng</span>
            <span className="font-outfit tabular-nums font-semibold text-zinc-800">
              {pricing.shippingFee === 0
                ? 'Miễn phí'
                : formatVnd(pricing.shippingFee)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-zinc-500 mb-3.5">
            <span className="font-outfit font-medium">VAT (10%)</span>
            <span className="font-outfit tabular-nums font-semibold text-zinc-800">{formatVnd(pricing.vatAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-900 pt-4 border-t border-zinc-100 mt-2">
            <span className="font-outfit text-base font-bold">Tổng thanh toán</span>
            <span className="font-outfit tabular-nums text-xl font-bold text-primary">{formatVnd(pricing.total)}</span>
          </div>
        </div>

        <div className="mb-6 pt-4 border-t border-zinc-100">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400 text-left">
            Phương thức thanh toán
          </h3>
          <div className="flex flex-col gap-3">
            
            {/* COD Option */}
            <label
              className={`flex cursor-pointer items-center justify-between gap-3.5 rounded-xl border p-4 transition-all duration-200 select-none hover:border-zinc-300 active:scale-[0.99] ${
                form.paymentMethod === 'COD'
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                  : 'border-zinc-200 bg-white'
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
              <div className="flex items-center gap-3 text-left">
                <div className={`p-2 rounded-lg ${form.paymentMethod === 'COD' ? 'bg-primary/10 text-primary' : 'bg-zinc-50 text-zinc-500'}`}>
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-outfit text-sm font-bold text-zinc-800">
                    Thanh toán COD
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    Thanh toán khi nhận hàng
                  </span>
                </div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  form.paymentMethod === 'COD'
                    ? 'border-primary bg-primary text-white'
                    : 'border-zinc-300 bg-white'
                }`}
              >
                {form.paymentMethod === 'COD' && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
            </label>

            {/* PayOS Option */}
            <label
              className={`flex cursor-pointer items-center justify-between gap-3.5 rounded-xl border p-4 transition-all duration-200 select-none hover:border-zinc-300 active:scale-[0.99] ${
                form.paymentMethod === 'ONLINE'
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                  : 'border-zinc-200 bg-white'
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
              <div className="flex items-center gap-3 text-left">
                <div className={`p-2 rounded-lg ${form.paymentMethod === 'ONLINE' ? 'bg-primary/10 text-primary' : 'bg-zinc-50 text-zinc-500'}`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-outfit text-sm font-bold text-zinc-800">
                    PayOS chuyển khoản QR
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    Mã QR ngân hàng tiện lợi
                  </span>
                </div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  form.paymentMethod === 'ONLINE'
                    ? 'border-primary bg-primary text-white'
                    : 'border-zinc-300 bg-white'
                }`}
              >
                {form.paymentMethod === 'ONLINE' && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
            </label>

          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-error/20 bg-error/5 text-error text-center text-sm font-medium mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          form="checkout-form"
          disabled={isProcessing || cartLines.length === 0}
          className={`w-full py-4 px-6 rounded-xl text-white font-outfit font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${
            form.paymentMethod === 'ONLINE'
              ? 'bg-primary hover:bg-primary-hover shadow-primary/20 hover:shadow-primary/30'
              : 'bg-zinc-900 hover:bg-zinc-800 shadow-zinc-900/20 hover:shadow-zinc-900/30'
          }`}
        >
          {isProcessing ? (
            <span>Đang xử lý...</span>
          ) : form.paymentMethod === 'ONLINE' ? (
            <span>Thanh toán PayOS • {formatVnd(pricing.total)}</span>
          ) : (
            <span>Đặt hàng COD • {formatVnd(pricing.total)}</span>
          )}
        </button>

        <button
          type="button"
          className="w-full py-3.5 px-6 rounded-xl border border-zinc-200 text-zinc-600 font-outfit font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:bg-zinc-50 hover:text-zinc-800 active:scale-[0.98] mt-3"
          onClick={onBackToCart}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại giỏ hàng</span>
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
