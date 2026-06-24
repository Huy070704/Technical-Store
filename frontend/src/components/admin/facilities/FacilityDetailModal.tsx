import MaterialIcon from '../shared/MaterialIcon';
import type { FacilityDetail } from '@/services/facilityService';

type FacilityDetailModalProps = {
  facility: FacilityDetail | null;
  loading?: boolean;
  onClose: () => void;
};

const DEFAULT_AVATAR =
  'https://ui-avatars.com/api/?background=e2e8f0&color=475569&name=';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
};

const shortId = (id: string) => `FAC-${id.slice(-4).toUpperCase()}`;

const FacilityDetailModal = ({ facility, loading = false, onClose }: FacilityDetailModalProps) => {
  const actualManager = facility?.manager || facility?.staffs.find(s => s.role?.toLowerCase().includes('manager'));
  const staffMembers = facility?.staffs.filter(s => !s.role?.toLowerCase().includes('manager')) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-bg-card shadow-xl border border-slate-border/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Chi tiết cơ sở</h2>
            <p className="text-body-sm text-secondary">Thông tin đầy đủ về cơ sở và nhân sự.</p>
          </div>
          <button
            aria-label="Đóng"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        {loading || !facility ? (
          <div className="flex h-48 items-center justify-center text-secondary">Đang tải thông tin...</div>
        ) : (
          <div className="space-y-lg p-lg">
            {/* Tiêu đề cơ sở + trạng thái */}
            <div className="flex items-start justify-between gap-md">
              <div className="flex items-start gap-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MaterialIcon name="apartment" className="text-[28px]" />
                </div>
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">{facility.name ?? '—'}</h3>
                  <p className="text-label-xs text-secondary">{shortId(facility.id)}</p>
                </div>
              </div>
              {facility.isActive ? (
                <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-label-xs">Hoạt động</span>
              ) : (
                <span className="px-3 py-1 bg-error/10 text-error rounded-full text-label-xs">Đã khóa</span>
              )}
            </div>

            {/* Lưới thông tin */}
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <InfoField icon="location_on" label="Địa chỉ" value={facility.address} />
              <InfoField icon="call" label="Số điện thoại" value={facility.phone} />
              <InfoField icon="mail" label="Email" value={facility.email} />
              <InfoField icon="groups" label="Số nhân viên" value={String(facility.staffCount)} />
              <InfoField icon="calendar_add_on" label="Ngày tạo" value={formatDate(facility.createdAt)} />
              <InfoField icon="update" label="Cập nhật gần nhất" value={formatDate(facility.updatedAt)} />
            </div>

            {/* Quản lý */}
            <div className="space-y-xs">
              <h4 className="text-label-md font-semibold text-on-surface">Quản lý cơ sở</h4>
              {actualManager ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-border/50 bg-surface-container-low p-md">
                  <img
                    alt="Quản lý"
                    className="h-10 w-10 rounded-full object-cover"
                    src={actualManager.avatar || `${DEFAULT_AVATAR}${encodeURIComponent(actualManager.name ?? 'NA')}`}
                  />
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{actualManager.name ?? '—'}</p>
                    <p className="text-label-xs text-secondary">{actualManager.email ?? '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-border/50 bg-surface-container-low p-md text-body-sm text-secondary">
                  Chưa phân công quản lý.
                </p>
              )}
            </div>

            {/* Nhân viên */}
            <div className="space-y-xs">
              <h4 className="text-label-md font-semibold text-on-surface">
                Nhân viên ({staffMembers.length})
              </h4>
              {staffMembers.length === 0 ? (
                <p className="rounded-lg border border-slate-border/50 bg-surface-container-low p-md text-body-sm text-secondary">
                  Chưa có nhân viên nào thuộc cơ sở này.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-border/50">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-md py-2 text-label-xs text-secondary">Họ tên</th>
                        <th className="px-md py-2 text-label-xs text-secondary">Email</th>
                        <th className="px-md py-2 text-label-xs text-secondary">Vai trò</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/50">
                      {staffMembers.map((staff) => (
                        <tr key={staff.id}>
                          <td className="px-md py-2 text-body-sm text-on-surface">{staff.name ?? '—'}</td>
                          <td className="px-md py-2 text-body-sm text-secondary">{staff.email ?? '—'}</td>
                          <td className="px-md py-2 text-body-sm text-secondary">{staff.role ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end border-t border-slate-border/50 px-lg py-md">
          <button
            className="rounded-lg px-lg py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft"
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

type InfoFieldProps = { icon: string; label: string; value: string | null };

const InfoField = ({ icon, label, value }: InfoFieldProps) => (
  <div className="flex items-start gap-2">
    <MaterialIcon name={icon} className="text-[20px] text-secondary mt-[2px]" />
    <div>
      <p className="text-label-xs text-secondary">{label}</p>
      <p className="text-body-sm text-on-surface break-words">{value || '—'}</p>
    </div>
  </div>
);

export default FacilityDetailModal;
