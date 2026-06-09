import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Shield, User, LogOut, CheckCircle2, ShoppingBag, Calendar, UserCheck } from 'lucide-react';
import { authService, getRoleName } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/types/auth';
import { Footer } from '@/components/layout/Footer';

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
    
    // Simple phone regex check if present
    const cleanedPhone = editPhone.trim().replace(/\D/g, '');
    if (editPhone.trim() && !/^(0|84)\d{9,10}$/.test(cleanedPhone)) {
      setUpdateError('Số điện thoại không hợp lệ (phải gồm 10-11 chữ số)');
      return;
    }

    setSaving(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const updated = await authService.updateProfile(user.email, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
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
