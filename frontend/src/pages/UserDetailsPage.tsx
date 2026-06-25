import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Shield, User, LogOut, CheckCircle2, ShoppingBag, Calendar, UserCheck, MapPin, Trash2, Plus, Check } from 'lucide-react';
import { authService, getRoleName } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { isValidVnPhone, normalizeVnPhone, vnPhoneErrorMessage } from '@/utils/phoneValidation';
import type { AuthUser } from '@/types/auth';
import { Footer } from '@/components/layout/Footer';
import { useVietnamProvinces } from '@/hooks/useVietnamProvinces';
import { getDistrictsByProvince, getWardsByDistrict } from '@/services/vietnamProvinces';

export const UserDetailsPage = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');

  // Address states
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newWard, setNewWard] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');

  const { provinces, loading: provincesLoading } = useVietnamProvinces();

  const availableDistricts = useMemo(
    () => getDistrictsByProvince(provinces, newCity),
    [provinces, newCity],
  );

  const availableWards = useMemo(
    () => getWardsByDistrict(provinces, newCity, newDistrict),
    [provinces, newCity, newDistrict],
  );

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await authService.getUserProfile();
        setUser(profile);
      } catch {
        setError('Không tải được thông tin tài khoản');
      } finally {
        setLoading(false);
      }
    };
    void fetchDetails();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!editName.trim() || editName.trim().length < 2) {
      setUpdateError('Họ tên phải có ít nhất 2 ký tự');
      return;
    }

    if (editPhone.trim() && !isValidVnPhone(editPhone.trim())) {
      setUpdateError(vnPhoneErrorMessage);
      return;
    }

    setSaving(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const updated = await authService.updateProfile(user.email, {
        name: editName.trim(),
        phone: editPhone.trim() ? normalizeVnPhone(editPhone.trim()) : undefined,
      });
      setUser((prev) => prev ? { ...prev, ...updated } : null);
      setUpdateSuccess('Cập nhật thông tin cá nhân thành công!');
      setIsEditing(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Cập nhật thông tin thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    if (!user) return;
    
    if (!newStreet.trim() || newStreet.trim().length < 10) {
      setAddressError('Số nhà, tên đường phải có ít nhất 10 ký tự');
      return;
    }
    if (!newCity) {
      setAddressError('Vui lòng chọn Tỉnh/Thành phố');
      return;
    }
    if (!newDistrict) {
      setAddressError('Vui lòng chọn Quận/Huyện');
      return;
    }
    if (!newWard) {
      setAddressError('Vui lòng chọn Phường/Xã');
      return;
    }

    const fullAddress = [
      newStreet.trim(),
      newWard.trim(),
      newDistrict.trim(),
      newCity.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    // Check duplicate
    const currentAddresses = user.addresses || [];
    if (currentAddresses.includes(fullAddress)) {
      setAddressError('Địa chỉ này đã tồn tại trong danh sách');
      return;
    }

    setSaving(true);
    setAddressError('');
    setAddressSuccess('');

    try {
      const updatedAddresses = [...currentAddresses, fullAddress];
      const updatedPayload: any = {
        addresses: updatedAddresses,
      };
      if (!user.address) {
        updatedPayload.address = fullAddress;
      }

      const updated = await authService.updateProfile(user.email, updatedPayload);
      setUser((prev) => prev ? { ...prev, ...updated } : null);
      setAddressSuccess('Thêm địa chỉ giao hàng thành công!');
      setIsAddingAddress(false);
      // Reset form
      setNewStreet('');
      setNewCity('');
      setNewDistrict('');
      setNewWard('');
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Không thể lưu địa chỉ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addrToDelete: string) => {
    if (!user) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;

    setSaving(true);
    setAddressError('');
    setAddressSuccess('');

    try {
      const currentAddresses = user.addresses || [];
      const updatedAddresses = currentAddresses.filter((a) => a !== addrToDelete);
      
      const updatedPayload: any = {
        addresses: updatedAddresses,
      };
      
      if (user.address === addrToDelete) {
        updatedPayload.address = updatedAddresses.length > 0 ? updatedAddresses[0] : null;
      }

      const updated = await authService.updateProfile(user.email, updatedPayload);
      setUser((prev) => prev ? { ...prev, ...updated } : null);
      setAddressSuccess('Xóa địa chỉ thành công!');
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Không thể xóa địa chỉ');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addrToSet: string) => {
    if (!user) return;

    setSaving(true);
    setAddressError('');
    setAddressSuccess('');

    try {
      const updated = await authService.updateProfile(user.email, {
        address: addrToSet,
      });
      setUser((prev) => prev ? { ...prev, ...updated } : null);
      setAddressSuccess('Đã đặt địa chỉ mặc định mới!');
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Không thể đặt địa chỉ mặc định');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const roleName = getRoleName(user) ?? 'Thành viên';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-[95px] bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-body-sm text-secondary">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 pt-[95px] bg-bg-base">
        <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-center max-w-sm">
          <p className="text-body-sm text-error font-medium">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover shadow-primary-glow"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  const alertSuccessClass = "mb-4 flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary/5 p-4 text-body-sm text-tertiary font-medium";
  const alertErrorClass = "mb-4 flex items-start gap-3 rounded-lg border border-error/30 bg-error-container p-4 text-body-sm text-error font-medium";

  return (
    <div className="min-h-screen bg-bg-base pt-[95px]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          
          {/* Left Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-slate-border/80 bg-bg-card p-6 shadow-card text-center relative">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
              
              <div className="relative mt-4 mb-4 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-hover text-headline-xl font-black text-on-primary shadow-primary-glow select-none">
                  {getInitials(user?.name)}
                </div>
              </div>

              <h2 className="text-lg font-bold text-on-surface line-clamp-1 px-2">
                {user?.name || 'Thành viên'}
              </h2>
              
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-light/50 border border-primary/10 px-3 py-0.5 text-label-xs font-semibold uppercase tracking-wider text-primary">
                <Shield className="h-3 w-3" />
                {roleName}
              </div>

              <div className="mt-6 border-t border-slate-border/60 pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/order-history')}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-body-sm font-medium text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all active:scale-[0.98]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Đơn hàng của tôi
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-body-sm font-medium text-error hover:bg-error/5 transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-border bg-bg-card px-5 py-3 text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex flex-col gap-6">
            
            {/* Status Messages */}
            {updateSuccess && (
              <div className={alertSuccessClass}>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-tertiary" />
                <span>{updateSuccess}</span>
              </div>
            )}
            {updateError && (
              <div className={alertErrorClass}>
                <span>{updateError}</span>
              </div>
            )}

            <div className="rounded-2xl border border-slate-border bg-bg-card p-6 shadow-card md:p-8">
              
              <div className="flex items-center justify-between border-b border-slate-border/60 pb-4">
                <div>
                  <h1 className="text-headline-lg font-black tracking-tight text-on-surface">Thông tin tài khoản</h1>
                  <p className="mt-1 text-body-sm text-secondary">
                    Quản lý và cấu hình thông tin cá nhân của bạn
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditName(user?.name || '');
                      setEditPhone(user?.phone || '');
                      setUpdateSuccess('');
                      setUpdateError('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light transition-all active:scale-[0.98]"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {isEditing ? (
                /* Edit Mode Form */
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    
                    {/* Họ tên input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Họ tên *
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-slate-border bg-bg-card px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="Nhập họ tên của bạn"
                      />
                    </div>

                    {/* Số điện thoại input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-border bg-bg-card px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="Nhập số điện thoại (ví dụ: 0987654321)"
                      />
                    </div>

                    {/* Email (Read only in edit mode) */}
                    <div className="flex flex-col gap-1.5 opacity-60">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email (Không thể thay đổi)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ''}
                        className="w-full rounded-lg border border-slate-border bg-surface-container-low px-4 py-2.5 text-body-sm text-secondary cursor-not-allowed"
                      />
                    </div>

                    {/* Vai trò (Read only in edit mode) */}
                    <div className="flex flex-col gap-1.5 opacity-60">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Vai trò (Không thể thay đổi)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={roleName}
                        className="w-full rounded-lg border border-slate-border bg-surface-container-low px-4 py-2.5 text-body-sm text-secondary cursor-not-allowed capitalize"
                      />
                    </div>

                  </div>

                  <div className="flex gap-3 border-t border-slate-border/60 pt-5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSave}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setIsEditing(false);
                        setUpdateError('');
                      }}
                      className="flex-1 rounded-xl border border-slate-border bg-bg-card py-2.5 text-center text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode Cards */
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  
                  {/* Họ tên */}
                  <div className="group rounded-xl border border-slate-border/60 bg-bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_4px_20px_rgba(11,28,48,0.03)]">
                    <div className="mb-2 flex items-center gap-2 text-label-xs font-bold uppercase tracking-wider text-secondary">
                      <User className="h-4 w-4 text-primary" />
                      Họ tên
                    </div>
                    <p className="text-body-md font-semibold text-on-surface">{user?.name || '—'}</p>
                  </div>

                  {/* Email */}
                  <div className="group rounded-xl border border-slate-border/60 bg-bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_4px_20px_rgba(11,28,48,0.03)]">
                    <div className="mb-2 flex items-center gap-2 text-label-xs font-bold uppercase tracking-wider text-secondary">
                      <Mail className="h-4 w-4 text-primary" />
                      Email
                    </div>
                    <p className="text-body-md font-semibold text-on-surface break-all">{user?.email || '—'}</p>
                  </div>

                  {/* Số điện thoại */}
                  <div className="group rounded-xl border border-slate-border/60 bg-bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_4px_20px_rgba(11,28,48,0.03)]">
                    <div className="mb-2 flex items-center gap-2 text-label-xs font-bold uppercase tracking-wider text-secondary">
                      <Phone className="h-4 w-4 text-primary" />
                      Số điện thoại
                    </div>
                    <p className="text-body-md font-semibold text-on-surface">
                      {user?.phone ? user.phone : <span className="text-secondary font-normal italic">Chưa cập nhật</span>}
                    </p>
                  </div>

                  {/* Vai trò */}
                  <div className="group rounded-xl border border-slate-border/60 bg-bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-[0_4px_20px_rgba(11,28,48,0.03)]">
                    <div className="mb-2 flex items-center gap-2 text-label-xs font-bold uppercase tracking-wider text-secondary">
                      <UserCheck className="h-4 w-4 text-primary" />
                      Vai trò
                    </div>
                    <p className="text-body-md font-semibold text-on-surface capitalize">{roleName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Addresses Card */}
            <div className="rounded-2xl border border-slate-border bg-bg-card p-6 shadow-card md:p-8">
              <div className="flex items-center justify-between border-b border-slate-border/60 pb-4">
                <div>
                  <h3 className="text-body-md font-bold text-on-surface">Sổ địa chỉ nhận hàng</h3>
                  <p className="mt-1 text-body-sm text-secondary">
                    Quản lý danh sách địa chỉ giao hàng của bạn
                  </p>
                </div>
                {!isAddingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAddress(true);
                      setAddressError('');
                      setAddressSuccess('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light transition-all active:scale-[0.98]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm địa chỉ mới
                  </button>
                )}
              </div>

              {addressSuccess && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary/5 p-4 text-body-sm text-tertiary font-medium">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-tertiary" />
                  <span>{addressSuccess}</span>
                </div>
              )}

              {addressError && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-error/30 bg-error-container p-4 text-body-sm text-error font-medium">
                  <span>{addressError}</span>
                </div>
              )}

              {isAddingAddress ? (
                /* Add Address Form */
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                      Số nhà, tên đường *
                    </label>
                    <input
                      type="text"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      className="w-full rounded-lg border border-slate-border bg-bg-card px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                      placeholder="Ví dụ: 123 Đường Nguyễn Trãi"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                        Tỉnh/Thành phố *
                      </label>
                      <select
                        value={newCity}
                        onChange={(e) => {
                          setNewCity(e.target.value);
                          setNewDistrict('');
                          setNewWard('');
                        }}
                        className="w-full rounded-lg border border-slate-border bg-bg-card px-3 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                      >
                        <option value="">Chọn tỉnh/thành phố</option>
                        {Object.keys(provinces).map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                        Quận/Huyện *
                      </label>
                      <select
                        value={newDistrict}
                        onChange={(e) => {
                          setNewDistrict(e.target.value);
                          setNewWard('');
                        }}
                        disabled={!newCity || availableDistricts.length === 0}
                        className="w-full rounded-lg border border-slate-border bg-bg-card px-3 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50"
                      >
                        <option value="">Chọn quận/huyện</option>
                        {availableDistricts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                        Phường/Xã *
                      </label>
                      <select
                        value={newWard}
                        onChange={(e) => setNewWard(e.target.value)}
                        disabled={!newDistrict || availableWards.length === 0}
                        className="w-full rounded-lg border border-slate-border bg-bg-card px-3 py-2.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50"
                      >
                        <option value="">Chọn phường/xã</option>
                        {availableWards.map((ward) => (
                          <option key={ward} value={ward}>
                            {ward}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-slate-border/60 pt-4">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleAddAddress}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
                    >
                      Lưu địa chỉ
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setIsAddingAddress(false);
                        setAddressError('');
                      }}
                      className="flex-1 rounded-xl border border-slate-border bg-bg-card py-2.5 text-center text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                /* Address List */
                <div className="mt-6 space-y-3">
                  {!user?.addresses || user.addresses.length === 0 ? (
                    <p className="text-body-sm text-secondary italic text-center py-4">
                      Bạn chưa thêm địa chỉ nhận hàng nào.
                    </p>
                  ) : (
                    user.addresses.map((addr) => {
                      const isDefault = user.address === addr;
                      return (
                        <div
                          key={addr}
                          className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
                            isDefault
                              ? 'border-primary bg-primary-light/5'
                              : 'border-slate-border/60 bg-bg-card hover:border-slate-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${isDefault ? 'text-primary' : 'text-secondary'}`} />
                            <div className="flex flex-col gap-1 text-left">
                              <p className="text-body-sm font-semibold text-on-surface">
                                {addr}
                              </p>
                              {isDefault && (
                                <span className="inline-flex self-start items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr)}
                                className="rounded px-2.5 py-1 text-xs font-semibold border border-slate-border text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all active:scale-[0.98]"
                              >
                                Đặt mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr)}
                              className="rounded p-1 text-xs font-semibold text-error hover:bg-error/5 transition-all active:scale-[0.98]"
                              title="Xóa địa chỉ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Security & Activity Card */}
            <div className="rounded-2xl border border-slate-border bg-bg-card p-6 shadow-card">
              <h3 className="text-body-md font-bold text-on-surface">Bảo mật & Trạng thái</h3>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-body-sm text-secondary">
                  <CheckCircle2 className="h-5 w-5 text-tertiary shrink-0" />
                  <span>Tài khoản đang hoạt động bình thường</span>
                </div>
                <div className="flex items-center gap-3 text-body-sm text-secondary">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <span>Bảo mật bằng OTP được kích hoạt bảo vệ thông tin đặt hàng</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UserDetailsPage;
