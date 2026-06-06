import { useEffect, useState } from 'react';
import { 
  AdminLayout, 
  PageHeader, 
  MetricCard,
  ConfirmModal
} from '../../components/admin';
import AccountTable from '../../components/admin/accounts/AccountTable';
import AccountFormModal from '../../components/admin/accounts/AccountFormModal';
import { adminAccountService } from '@/services/accountService';
import type { AuthUser } from '@/types/auth';
import { useToast } from '@/contexts/ToastContext';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';

// Định nghĩa interface cho cấu trúc lỗi của Axios / API để tái sử dụng an toàn
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AdminAccountManagement = () => {
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // States for Editing Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);

  // States for ConfirmModal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AuthUser | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [accountData, roleData] = await Promise.all([
          adminAccountService.getAllAccounts(),
          adminAccountService.getRoles()
        ]);
        setAccounts(accountData);
        setRoles(roleData);
      } catch (err) {
        setError('Không thể tải danh sách tài khoản hoặc vai trò.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Tính toán số liệu thống kê dựa trên toàn bộ mảng accounts
  const totalUsers = accounts.length;
  // Active means registered AND NOT blocked
  const activeUsers = accounts.filter(a => a.isRegistered !== false && !a.isBlocked).length;
  const adminUsers = accounts.filter(a => {
    const role = typeof a.role === 'string' ? a.role : a.role?.name;
    return role?.toLowerCase().includes('admin') || role?.toLowerCase().includes('manager');
  }).length;

  const metrics = [
    {
      label: 'Tổng số tài khoản',
      value: totalUsers.toString(),
      icon: 'group',
      tone: 'primary' as const,
      meta: 'Tất cả đăng ký',
      metaTone: 'success' as const,
    },
    {
      label: 'Tài khoản hoạt động',
      value: activeUsers.toString(),
      icon: 'verified_user',
      tone: 'success' as const,
      meta: `${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}% hoạt động`,
      metaTone: 'success' as const,
    },
    {
      label: 'Nhân viên quản trị',
      value: adminUsers.toString(),
      icon: 'admin_panel_settings',
      tone: 'secondary' as const,
      meta: 'Quyền truy cập đặc biệt',
      metaTone: 'neutral' as const,
    },
  ];

  const handleEditClick = (account: AuthUser) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (payload: { name: string; phone: string; roleSlug: string }) => {
    if (!editingAccount) return;
    try {
      setSaving(true);
      setError('');
      const updatedAccount = await adminAccountService.updateAccount(editingAccount.email, payload);
      
      // Update account in state list
      setAccounts(prev => prev.map(acc => acc.email === editingAccount.email ? { ...acc, ...updatedAccount } : acc));
      setIsEditModalOpen(false);
      setEditingAccount(null);
      toast.success('Cập nhật tài khoản thành công!');
    } catch (err) {
      // Ép kiểu err về ApiError một cách an toàn để lấy message lỗi từ API
      const apiError = err as ApiError;
      const errMsg = apiError?.response?.data?.message || 'Cập nhật tài khoản thất bại.';
      setError(errMsg);
      toast.error(errMsg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBlockToggle = (account: AuthUser) => {
    setConfirmTarget(account);
    setIsConfirmOpen(true);
  };

  const handleConfirmBlock = async () => {
    if (!confirmTarget) return;
    const isBlocking = !confirmTarget.isBlocked;
    try {
      setConfirmLoading(true);
      setError('');
      const updatedAccount = await adminAccountService.updateAccount(confirmTarget.email, {
        isBlocked: isBlocking
      });
      // Update account in state list
      setAccounts(prev => prev.map(acc => acc.email === confirmTarget.email ? { ...acc, ...updatedAccount } : acc));
      setIsConfirmOpen(false);
      setConfirmTarget(null);
      
      if (isBlocking) {
        toast.success('Khóa tài khoản thành công!');
      } else {
        toast.success('Mở khóa tài khoản thành công!');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const actionName = isBlocking ? 'Khóa' : 'Mở khóa';
      const errMsg = apiError?.response?.data?.message || `${actionName} tài khoản thất bại.`;
      setError(errMsg);
      toast.error(errMsg);
      console.error(err);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Filter Accounts Logic
  const filteredAccounts = accounts.filter(account => {
    // 1. Search term filter
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch = keyword
      ? (account.name || '').toLowerCase().includes(keyword) ||
        (account.email || '').toLowerCase().includes(keyword) ||
        (account.phone || '').toLowerCase().includes(keyword)
      : true;

    // 2. Role filter
    const roleName = (typeof account.role === 'string' ? account.role : account.role?.name || '').toLowerCase();
    const matchesRole = selectedRole === 'all'
      ? true
      : roleName.includes(selectedRole);

    // 3. Status filter
    const isActive = account.isRegistered !== false;
    const isBlocked = !!account.isBlocked;
    const matchesStatus = selectedStatus === 'all'
      ? true
      : selectedStatus === 'active'
        ? (!isBlocked && isActive)
        : (isBlocked || !isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          description="Quản lý tài khoản người dùng, vai trò phân quyền và truy cập hệ thống."
          title="Quản Lý Tài Khoản"
        />

        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {error && (
          <div className="rounded-lg bg-error-container p-4 text-error">
            {error}
          </div>
        )}

        {/* Thanh Tìm kiếm & Lọc hiện đại */}
        <div className="w-full rounded-2xl border border-slate-border/50 bg-bg-card p-md shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            {/* Tìm kiếm Toàn cầu */}
            <div className="relative flex-1 max-w-xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
                <MaterialIcon name="search" className="text-[20px]" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                className="w-full rounded-xl border border-slate-border/80 bg-white py-sm pl-[44px] pr-md text-body-sm text-on-surface placeholder-secondary/60 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-md text-slate-400 hover:text-slate-600"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                </button>
              )}
            </div>

            {/* Các dropdown bộ lọc */}
            <div className="flex flex-wrap items-center gap-md">
              <div className="flex items-center gap-sm">
                <label htmlFor="role-filter" className="text-body-sm font-semibold text-secondary shrink-0">
                  Vai trò:
                </label>
                <select
                  id="role-filter"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer min-w-[120px]"
                >
                  <option value="all">Tất cả</option>
                  <option value="admin">Admin</option>
                  <option value="customer">customer</option>
                  <option value="shipper">shipper</option>
                  <option value="staff">staff</option>
                  <option value="manager">manager</option>
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <label htmlFor="status-filter" className="text-body-sm font-semibold text-secondary shrink-0">
                  Trạng thái:
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer min-w-[120px]"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Khối danh sách tài khoản */}
        <div className="flex flex-col space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-lg font-bold text-on-surface">Danh sách người dùng</h2>
            <span className="text-body-sm text-secondary">Tìm thấy {filteredAccounts.length} kết quả</span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-secondary">Đang tải danh sách tài khoản...</div>
            </div>
          ) : (
            <AccountTable 
              accounts={filteredAccounts} 
              onEditClick={handleEditClick}
              onBlockToggle={handleBlockToggle}
            />
          )}
        </div>

        {isEditModalOpen && (
          <AccountFormModal
            account={editingAccount}
            roles={roles}
            saving={saving}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingAccount(null);
            }}
            onSubmit={handleEditSubmit}
          />
        )}

        {isConfirmOpen && confirmTarget && (
          <ConfirmModal
            isOpen={isConfirmOpen}
            title={confirmTarget.isBlocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            message={
              confirmTarget.isBlocked
                ? `Bạn có chắc chắn muốn mở khóa cho tài khoản "${confirmTarget.name || confirmTarget.email}" không? Người dùng này sẽ được phép đăng nhập và sử dụng hệ thống.`
                : `Bạn có chắc chắn muốn khóa tài khoản "${confirmTarget.name || confirmTarget.email}" không? Họ sẽ bị đăng xuất và không thể tiếp tục truy cập vào hệ thống.`
            }
            confirmLabel={confirmTarget.isBlocked ? 'Mở khóa' : 'Khóa'}
            cancelLabel="Hủy"
            confirmTone={confirmTarget.isBlocked ? 'success' : 'error'}
            icon={confirmTarget.isBlocked ? 'lock_open' : 'block'}
            loading={confirmLoading}
            onConfirm={handleConfirmBlock}
            onCancel={() => {
              setIsConfirmOpen(false);
              setConfirmTarget(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAccountManagement;