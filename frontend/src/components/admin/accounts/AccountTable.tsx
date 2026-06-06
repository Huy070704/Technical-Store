import { useState } from 'react';
import type { AuthUser } from '@/types/auth';
import MaterialIcon from '../shared/MaterialIcon';
import { useAuth } from '@/contexts/AuthContext';

type AccountTableProps = {
  accounts: AuthUser[];
  onEditClick: (account: AuthUser) => void;
  onBlockToggle: (account: AuthUser) => void;
};

const ITEMS_PER_PAGE = 10; // Đặt giới hạn tối đa 10 dòng mỗi trang

const getRoleName = (role: AuthUser['role']) => {
  if (typeof role === 'string') return role;
  return role.name;
};

const getRoleColor = (roleName: string) => {
  const role = roleName.toLowerCase();
  if (role.includes('admin')) return 'bg-primary-light text-primary';
  if (role.includes('manager')) return 'bg-tertiary/20 text-tertiary';
  if (role.includes('staff')) return 'bg-secondary/20 text-secondary';
  if (role.includes('shipper')) return 'bg-orange-500/20 text-orange-500';
  return 'bg-surface-container text-on-surface-variant';
};

const getRoleRank = (role: AuthUser['role']) => {
  const roleSlug = (typeof role === 'string' ? role : role.slug || role.name || '').toLowerCase();
  if (roleSlug.includes('admin')) return 100;
  if (roleSlug.includes('manager')) return 80;
  if (roleSlug.includes('staff')) return 60;
  if (roleSlug.includes('shipper')) return 40;
  if (roleSlug.includes('customer')) return 20;
  return 0;
};

const AccountTable = ({ accounts, onEditClick, onBlockToggle }: AccountTableProps) => {
  const { user: currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = accounts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  
  const currentAccounts = accounts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-border bg-bg-soft">
              {['Tài khoản', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Hành động'].map((header) => (
                <th
                  key={header}
                  className={`px-lg py-md text-label-md uppercase text-secondary ${
                    header === 'Hành động' ? 'text-right' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border/30">
            {currentAccounts.map((account) => {
              const roleName = getRoleName(account.role);
              const isActive = account.isRegistered !== false;

              // Check permissions: A user can only edit/block someone with smaller privilege (except themselves)
              const canAction = currentUser && (
                currentUser.email === account.email ||
                getRoleRank(currentUser.role) > getRoleRank(account.role)
              );

              // Determine status indicator
              let statusText = 'Đang chờ';
              let statusColor = 'bg-slate-400';
              if (account.isBlocked) {
                statusText = 'Đã khóa';
                statusColor = 'bg-error';
              } else if (isActive) {
                statusText = 'Hoạt động';
                statusColor = 'bg-success';
              }

              return (
                <tr key={account.accountId || account.email} className="transition-colors hover:bg-surface-container-low">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                        <MaterialIcon name="person" />
                      </div>
                      <div>
                        <div className="text-label-md text-on-surface">{account.name || 'Chưa cập nhật'}</div>
                        <div className="text-body-sm text-secondary font-mono">{account.accountId?.substring(0, 8) || 'Không có ID'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md text-body-sm text-on-surface">{account.email}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface">{account.phone || 'Chưa cập nhật'}</td>
                  <td className="px-lg py-md">
                    <span className={`inline-flex items-center rounded-full px-sm py-1 text-label-sm font-medium ${getRoleColor(roleName)}`}>
                      {roleName}
                    </span>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-xs">
                      <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                      <span className="text-label-md text-on-surface">{statusText}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-right space-x-xs">
                    <button
                      aria-label={`Sửa ${account.name}`}
                      className="rounded p-xs text-secondary transition-all hover:bg-primary-light hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                      type="button"
                      disabled={!canAction}
                      onClick={() => onEditClick(account)}
                    >
                      <MaterialIcon name="edit" />
                    </button>
                    <button
                      aria-label={account.isBlocked ? `Mở khóa ${account.name}` : `Khóa ${account.name}`}
                      className={`rounded p-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary ${
                        account.isBlocked
                          ? 'text-success hover:bg-success/15 hover:text-success-hover'
                          : 'text-secondary hover:bg-error-container hover:text-error'
                      }`}
                      type="button"
                      disabled={!canAction || currentUser?.email === account.email} // Admin/user cannot block themselves
                      onClick={() => onBlockToggle(account)}
                    >
                      <MaterialIcon name={account.isBlocked ? 'lock_open' : 'block'} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
        <span className="text-body-sm text-secondary">
          Hiển thị từ {totalItems === 0 ? 0 : indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, totalItems)} trong tổng số {totalItems} tài khoản
        </span>
        
        <div className="flex items-center gap-xs">
          <PaginationIcon 
            icon="chevron_left" 
            label="Trang trước" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`rounded-lg px-sm py-1 text-label-md transition-colors ${
                  currentPage === pageNumber
                    ? 'bg-primary text-on-primary'
                    : 'text-secondary hover:bg-bg-soft'
                }`}
                type="button"
              >
                {pageNumber}
              </button>
            );
          })}

          <PaginationIcon 
            icon="chevron_right" 
            label="Trang sau" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </div>
      </div>
    </section>
  );
};

type PaginationIconProps = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
};

const PaginationIcon = ({ icon, label, onClick, disabled }: PaginationIconProps) => (
  <button 
    aria-label={label} 
    onClick={onClick}
    disabled={disabled}
    className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed" 
    type="button"
  >
    <MaterialIcon name={icon} />
  </button>
);

export default AccountTable;