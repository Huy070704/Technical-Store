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
        setError('Failed to load accounts or roles');
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
      label: 'Total Accounts',
      value: totalUsers.toString(),
      icon: 'group',
      tone: 'primary' as const,
      meta: 'All registered',
      metaTone: 'success' as const,
    },
    {
      label: 'Active Users',
      value: activeUsers.toString(),
      icon: 'verified_user',
      tone: 'success' as const,
      meta: `${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}% active`,
      metaTone: 'success' as const,
    },
    {
      label: 'Admin Staff',
      value: adminUsers.toString(),
      icon: 'admin_panel_settings',
      tone: 'secondary' as const,
      meta: 'Privileged access',
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
    } catch (err) {
      // Ép kiểu err về ApiError một cách an toàn để lấy message lỗi từ API
      const apiError = err as ApiError;
      setError(apiError?.response?.data?.message || 'Failed to update account.');
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
    const action = confirmTarget.isBlocked ? 'unblock' : 'block';
    try {
      setConfirmLoading(true);
      setError('');
      const updatedAccount = await adminAccountService.updateAccount(confirmTarget.email, {
        isBlocked: !confirmTarget.isBlocked
      });
      // Update account in state list
      setAccounts(prev => prev.map(acc => acc.email === confirmTarget.email ? { ...acc, ...updatedAccount } : acc));
      setIsConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err) {
      // Đổi thành catch (err) không chứa ': any' và ép kiểu bên trong
      const apiError = err as ApiError;
      setError(apiError?.response?.data?.message || `Failed to ${action} account.`);
      console.error(err);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          description="Manage user accounts, roles, and system access."
          title="Account Management"
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

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-secondary">Loading accounts...</div>
          </div>
        ) : (
          <AccountTable 
            accounts={accounts} 
            onEditClick={handleEditClick}
            onBlockToggle={handleBlockToggle}
          />
        )}

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
            title={confirmTarget.isBlocked ? 'Unblock User' : 'Block User'}
            message={
              confirmTarget.isBlocked
                ? `Are you sure you want to unblock user "${confirmTarget.name || confirmTarget.email}"? They will be allowed to log in and use the system.`
                : `Are you sure you want to block user "${confirmTarget.name || confirmTarget.email}"? They will be signed out and prevented from accessing the system.`
            }
            confirmLabel={confirmTarget.isBlocked ? 'Unblock' : 'Block'}
            cancelLabel="Cancel"
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