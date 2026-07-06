import { useMemo, useState, useEffect } from 'react';
import type { AuthUser } from '@/types/auth';
import type { Facility } from '@/services/facilityService';
import MaterialIcon from '../shared/MaterialIcon';
import { adminAccountService } from '@/services/accountService';
import { useToast } from '@/contexts/ToastContext';
import { isWithinManagerLimit, MANAGER_LIMIT_MESSAGE } from '@/utils/managerLimit';

type GlobalAssignStaffModalProps = {
  accounts: AuthUser[];
  facilities: Facility[];
  loading?: boolean;
  onClose: () => void;
  onAccountUpdated: () => void;
};

const ASSIGNABLE_ROLES = ['staff', 'manager', 'shipper'];

const getRoleSlug = (role: AuthUser['role']) =>
  (typeof role === 'string' ? role : role.slug || role.name || '').toLowerCase();

const isAssignableRole = (role: AuthUser['role']) =>
  ASSIGNABLE_ROLES.some((r) => getRoleSlug(role).includes(r));

const getFacilityId = (account: AuthUser): string => {
  if (!account.facility) return '';
  return typeof account.facility === 'string' ? account.facility : account.facility.id;
};

const GlobalAssignStaffModal = ({
  accounts,
  facilities,
  loading = false,
  onClose,
  onAccountUpdated,
}: GlobalAssignStaffModalProps) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [noFacilityOnly, setNoFacilityOnly] = useState(false);
  
  const [roles, setRoles] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // Lưu trữ các thay đổi chưa được gửi lên server
  const [pendingChanges, setPendingChanges] = useState<Record<string, { roleSlug?: string; facilityId?: string | null }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const fetchedRoles = await adminAccountService.getRoles();
        setRoles(fetchedRoles.filter(r => ASSIGNABLE_ROLES.includes(r.slug.toLowerCase())));
      } catch (error) {
        toast.error('Không thể tải danh sách quyền.');
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [toast]);

  // Logic lọc nhân viên (chỉ lọc theo state gốc hoặc có tính pending?)
  // Tốt nhất là lọc dựa trên state cuối cùng (gốc + pending)
  const finalAccountsState = useMemo(() => {
    return accounts.map(acc => {
      const email = acc.email;
      const pending = pendingChanges[email];
      return {
        ...acc,
        computedFacId: pending?.facilityId !== undefined ? pending.facilityId : getFacilityId(acc),
        computedRoleSlug: pending?.roleSlug !== undefined ? pending.roleSlug : getRoleSlug(acc.role),
        hasChanges: !!pending
      };
    });
  }, [accounts, pendingChanges]);

  const filteredAccounts = useMemo(() => {
    return finalAccountsState.filter((acc) => {
      if (!isAssignableRole(acc.role) || acc.isBlocked) return false;
      
      if (noFacilityOnly && acc.computedFacId) return false;
      
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        const nameMatch = acc.name?.toLowerCase().includes(term);
        const emailMatch = acc.email?.toLowerCase().includes(term);
        if (!nameMatch && !emailMatch) return false;
      }
      
      return true;
    });
  }, [finalAccountsState, searchQuery, noFacilityOnly]);

  const handleLocalChange = (email: string, payload: { roleSlug?: string; facilityId?: string | null }) => {
    setPendingChanges(prev => {
      const existing = prev[email] || {};
      const updated = { ...existing, ...payload };
      
      // Kiểm tra nếu giống hệt state ban đầu thì xóa khỏi pending
      const acc = accounts.find(a => a.email === email);
      if (acc) {
        const originalFacId = getFacilityId(acc);
        const originalRoleSlug = getRoleSlug(acc.role);
        
        const isFacSame = updated.facilityId === undefined || updated.facilityId === originalFacId || (updated.facilityId === null && originalFacId === '');
        const isRoleSame = updated.roleSlug === undefined || updated.roleSlug === originalRoleSlug;
        
        if (isFacSame && isRoleSame) {
          const newChanges = { ...prev };
          delete newChanges[email];
          return newChanges;
        }
      }
      return { ...prev, [email]: updated };
    });
  };

  const handleSave = async () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0) {
      onClose();
      return;
    }

    // Validation: giới hạn tổng số manager toàn hệ thống (tối đa MAX_MANAGERS).
    // Dùng chung tiện ích với trang "Quản lý tài khoản" để đảm bảo logic nhất quán.
    const roleChanges: Record<string, string> = {};
    for (const [email, payload] of Object.entries(pendingChanges)) {
      if (payload.roleSlug !== undefined) roleChanges[email] = payload.roleSlug;
    }
    if (!isWithinManagerLimit(accounts, roleChanges)) {
      toast.error(MANAGER_LIMIT_MESSAGE);
      return;
    }

    // Validation: 1 Manager per Facility
    const managerCountPerFac: Record<string, number> = {};
    for (const acc of finalAccountsState) {
      if (acc.computedRoleSlug === 'manager' && acc.computedFacId) {
        managerCountPerFac[acc.computedFacId] = (managerCountPerFac[acc.computedFacId] || 0) + 1;
      }
    }

    const invalidFacIds = Object.keys(managerCountPerFac).filter(facId => managerCountPerFac[facId] > 1);
    if (invalidFacIds.length > 0) {
      const invalidNames = invalidFacIds.map(id => facilities.find(f => f.id === id)?.name || id).join(', ');
      toast.error(`Lỗi: Mỗi cơ sở chỉ được có 1 quản lý. Các cơ sở vi phạm: ${invalidNames}`);
      return;
    }

    setIsSaving(true);
    try {
      // Execute all updates
      const promises = Object.entries(pendingChanges).map(([email, payload]) => 
        adminAccountService.updateAccount(email, payload)
      );
      await Promise.all(promises);
      
      toast.success(`Đã cập nhật ${changesCount} nhân viên thành công!`);
      setPendingChanges({});
      onAccountUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl bg-bg-card shadow-2xl border border-slate-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-border/50 bg-bg-soft px-lg py-md shrink-0">
          <div className="flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MaterialIcon name="manage_accounts" />
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Quản lý nhân sự</h2>
              <p className="text-body-sm text-secondary">
                Phân công cơ sở và cập nhật chức vụ cho nhân viên
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng"
            className="rounded p-xs text-secondary transition-colors hover:bg-slate-200 hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-center justify-between border-b border-slate-border/50 px-lg py-md shrink-0">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
              <MaterialIcon name="search" className="text-[20px]" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, email..."
              className="w-full rounded-lg border border-slate-border/80 bg-surface-container-low py-sm pl-[44px] pr-md text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-on-surface"
            />
          </div>
          <label className="flex items-center gap-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-border/80 text-primary focus:ring-primary/20 cursor-pointer"
              checked={noFacilityOnly}
              onChange={(e) => setNoFacilityOnly(e.target.checked)}
            />
            <span className="text-body-sm font-medium text-on-surface">Chỉ hiện người chưa có cơ sở</span>
          </label>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-lg bg-surface-container-low/30">
          {loading || rolesLoading ? (
             <div className="flex h-48 items-center justify-center text-secondary gap-sm">
               <MaterialIcon name="sync" className="animate-spin" />
               Đang tải dữ liệu...
             </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card p-md text-secondary">
              Không tìm thấy nhân viên nào phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-border/50 bg-bg-card shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-lg py-md text-label-sm font-semibold uppercase text-secondary">Nhân viên</th>
                    <th className="px-lg py-md text-label-sm font-semibold uppercase text-secondary">Cơ sở hiện tại</th>
                    <th className="px-lg py-md text-label-sm font-semibold uppercase text-secondary">Chức vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border/50">
                  {filteredAccounts.map((acc) => {
                    const isChanged = acc.hasChanges;

                    return (
                      <tr key={acc.email} className={`transition-colors hover:bg-surface-container-low ${isChanged ? 'bg-primary/5' : ''}`}>
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-md">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-600 font-bold uppercase shrink-0 ${isChanged ? 'bg-primary text-on-primary' : 'bg-slate-200'}`}>
                              {(acc.name || acc.email).charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-label-md text-on-surface truncate">{acc.name || 'Chưa cập nhật'}</div>
                              <div className="text-body-sm text-secondary truncate">{acc.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-md">
                          <select
                            className={`w-full max-w-[200px] rounded-lg border bg-white px-md py-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 ${isChanged && pendingChanges[acc.email]?.facilityId !== undefined ? 'border-primary shadow-[0_0_0_1px_theme(colors.primary.DEFAULT)]' : 'border-slate-border/80 focus:border-primary'}`}
                            value={acc.computedFacId || ''}
                            onChange={(e) => handleLocalChange(acc.email, { facilityId: e.target.value || null })}
                            disabled={isSaving}
                          >
                            <option value="">— Chưa phân công —</option>
                            {facilities
                              .filter(f => f.isActive || f.id === acc.computedFacId)
                              .map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.name}{f.isActive ? '' : ' (Đã khóa)'}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-2">
                            <select
                              className={`w-full max-w-[150px] rounded-lg border bg-white px-md py-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 ${isChanged && pendingChanges[acc.email]?.roleSlug !== undefined ? 'border-primary shadow-[0_0_0_1px_theme(colors.primary.DEFAULT)]' : 'border-slate-border/80 focus:border-primary'}`}
                              value={acc.computedRoleSlug}
                              onChange={(e) => handleLocalChange(acc.email, { roleSlug: e.target.value })}
                              disabled={isSaving}
                            >
                              <option value={acc.computedRoleSlug} disabled hidden>
                                {acc.role && typeof acc.role !== 'string' && !pendingChanges[acc.email]?.roleSlug ? acc.role.name : acc.computedRoleSlug}
                              </option>
                              {roles.map(r => (
                                <option key={r.slug} value={r.slug}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-border/50 bg-bg-soft px-lg py-md shrink-0">
          <div className="text-body-sm text-secondary">
            {hasChanges ? (
              <span className="text-primary font-medium">{Object.keys(pendingChanges).length} thay đổi chưa lưu</span>
            ) : (
              <span>Chưa có thay đổi nào</span>
            )}
          </div>
          <div className="flex items-center gap-md">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg px-md py-sm text-label-md text-secondary transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-xs rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isSaving ? (
                <>
                  <MaterialIcon name="sync" className="animate-spin text-[18px]" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <MaterialIcon name="save" className="text-[18px]" />
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GlobalAssignStaffModal;
