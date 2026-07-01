import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout, PageHeader, MetricCard } from '@/components/admin';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  staffRequestService,
  STAFF_REQUEST_ROLE_LABELS,
  STAFF_REQUEST_STATUS_LABELS,
  type StaffRequest,
  type StaffRequestRole,
} from '@/services/staffRequestService';
import { formatDateTime } from '@/utils/dateFormatter';
import type { ProductMetric } from '@/components/admin/types/admin';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const PAGE_SIZE = 10;

const ManagerStaffRequestManagement = () => {
  const { user } = useAuth();
  const toast = useToast();

  const managerFacility = useMemo(() => {
    if (!user?.facility) return null;
    if (typeof user.facility === 'string') {
      return { id: user.facility, name: 'Cơ sở được phân công' };
    }
    return { id: user.facility.id, name: user.facility.name ?? 'Cơ sở được phân công' };
  }, [user?.facility]);

  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roleNeeded, setRoleNeeded] = useState<StaffRequestRole>('staff');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  const hasPendingRequest = requests.some((item) => item.status === 'pending');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffRequestService.getMyRequests(page, PAGE_SIZE);
      setRequests(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách yêu cầu nhân sự.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerFacility) {
      toast.error('Tài khoản chưa được gán cơ sở. Vui lòng liên hệ admin.');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      toast.error('Số lượng nhân sự không hợp lệ.');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('Lý do yêu cầu phải có ít nhất 10 ký tự.');
      return;
    }

    try {
      setSubmitting(true);
      await staffRequestService.createRequest({
        roleNeeded,
        quantity: parsedQuantity,
        reason: reason.trim(),
      });
      toast.success('Đã gửi yêu cầu bổ sung nhân sự cho admin.');
      setReason('');
      setQuantity('1');
      setRoleNeeded('staff');
      setPage(1);
      await loadRequests();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError?.response?.data?.message ?? 'Gửi yêu cầu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const metrics: ProductMetric[] = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'pending').length;
    const approved = requests.filter((item) => item.status === 'approved').length;
    const rejected = requests.filter((item) => item.status === 'rejected').length;

    return [
      {
        label: 'Tổng yêu cầu',
        value: total.toString(),
        icon: 'groups',
        tone: 'primary',
        meta: managerFacility?.name ?? 'Chưa gán cơ sở',
        metaTone: 'neutral',
      },
      {
        label: 'Chờ duyệt',
        value: pending.toString(),
        icon: 'pending_actions',
        tone: 'secondary',
        meta: 'Đang chờ admin',
        metaTone: 'danger',
      },
      {
        label: 'Đã duyệt',
        value: approved.toString(),
        icon: 'check_circle',
        tone: 'success',
        meta: 'Admin chấp nhận',
        metaTone: 'success',
      },
      {
        label: 'Đã từ chối',
        value: rejected.toString(),
        icon: 'cancel',
        tone: 'neutral',
        meta: 'Cần xem lại',
        metaTone: 'neutral',
      },
    ];
  }, [requests, total, managerFacility?.name]);

  const getStatusBadgeClass = (status: StaffRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success';
      case 'rejected':
        return 'bg-error/10 text-error';
      default:
        return 'bg-warning/10 text-amber-700';
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Yêu Cầu Bổ Sung Nhân Sự"
          description="Gửi yêu cầu thêm nhân sự cho cơ sở của bạn. Admin sẽ xem xét và phản hồi."
        />

        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {!managerFacility && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-md text-amber-800">
            Tài khoản manager chưa được gán cơ sở. Vui lòng liên hệ admin trước khi gửi yêu cầu.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-slate-border/50 bg-bg-card p-lg shadow-sm space-y-md"
        >
          <div className="flex items-center gap-sm">
            <MaterialIcon name="add_circle" className="text-primary text-[24px]" />
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Tạo yêu cầu mới</h2>
              <p className="text-body-sm text-secondary">
                Cơ sở: <span className="font-semibold text-on-surface">{managerFacility?.name ?? '—'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="space-y-xs">
              <label htmlFor="role-needed" className="text-label-md font-semibold text-on-surface">
                Vai trò cần bổ sung
              </label>
              <select
                id="role-needed"
                value={roleNeeded}
                onChange={(e) => setRoleNeeded(e.target.value as StaffRequestRole)}
                disabled={!managerFacility || hasPendingRequest}
                className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
              >
                {Object.entries(STAFF_REQUEST_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-xs">
              <label htmlFor="quantity" className="text-label-md font-semibold text-on-surface">
                Số lượng
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!managerFacility || hasPendingRequest}
                className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-xs">
            <label htmlFor="reason" className="text-label-md font-semibold text-on-surface">
              Lý do yêu cầu
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={!managerFacility || hasPendingRequest}
              placeholder="Mô tả lý do cần bổ sung nhân sự (tối thiểu 10 ký tự)..."
              className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>

          {hasPendingRequest && (
            <p className="text-body-sm text-amber-700">
              Bạn đang có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi gửi yêu cầu mới.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !managerFacility || hasPendingRequest}
              className="rounded-xl bg-primary px-lg py-sm text-body-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu cho Admin'}
            </button>
          </div>
        </form>

        {error && <div className="rounded-lg bg-error-container p-4 text-error">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-headline-lg font-bold text-on-surface">Lịch sử yêu cầu</h2>
          <span className="text-body-sm text-secondary">{total} yêu cầu</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
          {loading ? (
            <div className="px-lg py-xl text-center text-secondary">Đang tải danh sách...</div>
          ) : requests.length === 0 ? (
            <div className="px-lg py-xl text-center text-secondary">Chưa có yêu cầu nào.</div>
          ) : (
            <div className="divide-y divide-slate-border/30">
              {requests.map((request) => (
                <div key={request.id} className="p-lg space-y-sm">
                  <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-sm">
                        <h3 className="text-body-md font-bold text-on-surface">
                          {request.facilityName ?? managerFacility?.name ?? 'Cơ sở'}
                        </h3>
                        <span className={`inline-flex rounded-full px-sm py-xs text-label-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                          {STAFF_REQUEST_STATUS_LABELS[request.status]}
                        </span>
                      </div>
                      <p className="text-body-sm text-secondary mt-xs">
                        Cần bổ sung:{' '}
                        <span className="font-semibold text-on-surface">
                          {request.quantity} {STAFF_REQUEST_ROLE_LABELS[request.roleNeeded]}
                        </span>
                      </p>
                      <p className="text-body-sm text-secondary mt-xs italic">"{request.reason}"</p>
                      <p className="text-label-xs text-secondary mt-sm">
                        Gửi lúc {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  {request.adminNote && (
                    <div className="rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-secondary">
                      <span className="font-semibold text-on-surface">Phản hồi admin:</span> {request.adminNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerStaffRequestManagement;
