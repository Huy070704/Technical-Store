import type { AuthUser } from '@/types/auth';
import MaterialIcon from '../shared/MaterialIcon';

type AccountDetailModalProps = {
  account: AuthUser;
  onClose: () => void;
};

const getRoleName = (role: AuthUser['role']) => {
  if (typeof role === 'string') return role;
  return role.name;
};

const AccountDetailModal = ({ account, onClose }: AccountDetailModalProps) => {
  const roleName = getRoleName(account.role);
  const isActive = account.isRegistered !== false;

  // Determine status indicator
  let statusText = 'Đang chờ';
  let statusColor = 'text-slate-500 bg-slate-100';
  if (account.isBlocked) {
    statusText = 'Đã khóa';
    statusColor = 'text-error bg-error-container';
  } else if (isActive) {
    statusText = 'Hoạt động';
    statusColor = 'text-success bg-success-container';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-bg-card shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md shrink-0">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Chi tiết tài khoản
            </h2>
            <p className="text-body-sm text-secondary">Thông tin chi tiết về người dùng trong hệ thống.</p>
          </div>
          <button
            aria-label="Đóng chi tiết tài khoản"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="p-lg overflow-y-auto space-y-lg">
          <div className="flex flex-col md:flex-row gap-lg">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="aspect-square w-full overflow-hidden rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MaterialIcon name="person" className="text-[80px] text-primary" />
              </div>
            </div>
            
            <div className="w-full md:w-2/3 space-y-md">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface mb-xs">{account.name || 'Chưa cập nhật'}</h3>
                <div className="flex items-center gap-sm">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
                    {statusText}
                  </span>
                  <span className="text-xs font-medium text-primary bg-primary-light px-2 py-1 rounded">
                    {roleName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-sm gap-x-md">
                <div>
                  <div className="text-label-sm text-secondary">ID Tài khoản</div>
                  <div className="font-mono text-body-md text-on-surface">{account.accountId || 'Không có ID'}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Email</div>
                  <div className="text-body-md text-on-surface truncate">{account.email}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Số điện thoại</div>
                  <div className="text-body-md text-on-surface">{account.phone || 'Chưa cập nhật'}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Trạng thái đăng ký</div>
                  <div className="text-body-md text-on-surface">
                    {isActive ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-title-md font-semibold text-on-surface mb-sm">Ghi chú hệ thống</h4>
            <div className="bg-surface-container-low rounded-lg p-md border border-slate-border">
              <p className="text-body-md text-on-surface-variant">
                Tài khoản này có vai trò <span className="font-bold">{roleName}</span>. 
                {account.isBlocked 
                  ? ' Hiện tại tài khoản này đang bị khóa và không thể truy cập vào hệ thống.' 
                  : ' Hiện tại tài khoản này đang hoạt động bình thường.'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-border/50 px-lg py-md shrink-0 flex justify-end">
          <button
            className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailModal;
