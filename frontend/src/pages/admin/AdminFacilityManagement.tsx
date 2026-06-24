import { useEffect, useMemo, useState } from 'react';
import {
  AdminLayout,
  PageHeader,
  MetricCard,
  ConfirmModal
} from '../../components/admin';
import FacilityTable from '../../components/admin/facilities/FacilityTable';
import FacilityFormModal from '../../components/admin/facilities/FacilityFormModal';
import FacilityDetailModal from '../../components/admin/facilities/FacilityDetailModal';
import GlobalAssignStaffModal from '../../components/admin/facilities/GlobalAssignStaffModal';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { useToast } from '@/contexts/ToastContext';
import { adminAccountService } from '@/services/accountService';
import type { AuthUser } from '@/types/auth';
import {
  facilityService,
  type Facility,
  type FacilityDetail,
  type FacilitySummary,
  type UpdateFacilityPayload,
} from '../../services/facilityService';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AdminFacilityManagement = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [summary, setSummary] = useState<FacilitySummary>({
    total: 0,
    active: 0,
    inactive: 0,
    assignedStaff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingFacilityId, setViewingFacilityId] = useState<string | null>(null);
  const [viewingFacilityDetail, setViewingFacilityDetail] = useState<FacilityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Facility | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Global Assign Staff Modal states
  const [isGlobalAssignModalOpen, setIsGlobalAssignModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await facilityService.getFacilities();
      setFacilities(data.facilities);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      setError('Không thể tải dữ liệu cơ sở. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await adminAccountService.getAllAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadAccounts();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      if (f.address) set.add(f.address);
    });
    return Array.from(set);
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    const term = search.trim().toLowerCase();
    return facilities.filter((f) => {
      const matchesSearch =
        !term ||
        (f.name?.toLowerCase().includes(term) ?? false) ||
        f.id.toLowerCase().includes(term) ||
        (f.address?.toLowerCase().includes(term) ?? false);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && f.isActive) ||
        (statusFilter === 'inactive' && !f.isActive);
      const matchesLocation =
        locationFilter === 'all' || f.address === locationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [facilities, search, statusFilter, locationFilter]);

  const metrics = [
    {
      label: 'Tổng số cơ sở',
      value: summary.total.toString(),
      icon: 'apartment',
      tone: 'primary' as const,
      meta: 'Tất cả cơ sở',
      metaTone: 'success' as const,
    },
    {
      label: 'Đang hoạt động',
      value: summary.active.toString(),
      icon: 'check_circle',
      tone: 'success' as const,
      meta: `${summary.total > 0 ? Math.round((summary.active / summary.total) * 100) : 0}% hoạt động`,
      metaTone: 'success' as const,
    },
    {
      label: 'Ngừng hoạt động',
      value: summary.inactive.toString(),
      icon: 'cancel',
      tone: 'error' as const,
      meta: 'Cần kiểm tra',
      metaTone: 'error' as const,
    },
    {
      label: 'Tổng nhân viên',
      value: summary.assignedStaff.toLocaleString(),
      icon: 'groups',
      tone: 'secondary' as const,
      meta: 'Đã phân bổ',
      metaTone: 'neutral' as const,
    },
  ];

  const handleEditClick = (facility: Facility) => {
    setEditingFacility(facility);
    setIsEditModalOpen(true);
  };

  const handleViewClick = async (facility: Facility) => {
    setViewingFacilityId(facility.id);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const detail = await facilityService.getFacilityById(facility.id);
      setViewingFacilityDetail(detail);
    } catch (err) {
      toast.error('Không thể tải thông tin chi tiết cơ sở.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBlockToggle = (facility: Facility) => {
    setConfirmTarget(facility);
    setIsConfirmOpen(true);
  };

  // Phân công nhân viên global đã được chuyển qua GlobalAssignStaffModal

  const handleEditSubmit = async (payload: UpdateFacilityPayload) => {
    if (!editingFacility) return;
    try {
      setSaving(true);
      setError('');
      const updatedFacility = await facilityService.updateFacility(editingFacility.id, payload);
      setFacilities(prev => prev.map(fac => fac.id === editingFacility.id ? { ...fac, ...updatedFacility } : fac));
      setIsEditModalOpen(false);
      setEditingFacility(null);
      toast.success('Cập nhật cơ sở thành công!');
      loadData(); // To update summary as well
    } catch (err) {
      const apiError = err as ApiError;
      const errMsg = apiError?.response?.data?.message || 'Cập nhật cơ sở thất bại.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!confirmTarget) return;
    const isBlocking = confirmTarget.isActive; // isActive means we want to block it, !isActive means unblock
    try {
      setConfirmLoading(true);
      setError('');
      const updatedFacility = await facilityService.setActive(confirmTarget.id, !isBlocking);
      setFacilities(prev => prev.map(fac => fac.id === confirmTarget.id ? { ...fac, ...updatedFacility } : fac));
      setIsConfirmOpen(false);
      setConfirmTarget(null);

      if (isBlocking) {
        toast.success('Khóa cơ sở thành công!');
      } else {
        toast.success('Mở khóa cơ sở thành công!');
      }
      loadData(); // To update summary
      // Khóa cơ sở sẽ gỡ toàn bộ nhân viên về 'Chưa phân công' ở backend,
      // tải lại tài khoản để mục "Quản lý nhân sự" phản ánh đúng trạng thái.
      loadAccounts();
    } catch (err) {
      const apiError = err as ApiError;
      const actionName = isBlocking ? 'Khóa' : 'Mở khóa';
      const errMsg = apiError?.response?.data?.message || `${actionName} cơ sở thất bại.`;
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        {/* ...THAY THẾ BẰNG TOÀN BỘ KHỐI NÀY... */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            description="Quản lý danh sách các cơ sở, thông tin liên hệ và trạng thái hoạt động."
            title="Quản Lý Cơ Sở"
          />

          {/* Cụm Action Buttons nằm bên phải */}
          <div className="flex items-center gap-sm shrink-0">
            {/* NÚT YÊU CẦU NHÂN SỰ MỚI */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="relative flex items-center gap-xs rounded-xl border border-warning/40 bg-warning/10 px-md py-sm text-body-sm font-semibold text-amber-700 transition-all hover:bg-warning/20"
            >
              <MaterialIcon name="pending_actions" className="text-[20px]" />
              <span>Yêu cầu nhân sự</span>
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[11px] font-bold text-white shadow-sm animate-pulse">
                2
              </span>
            </button>

            {/* Nút quản lý nhân sự */}
            <button
              onClick={() => setIsGlobalAssignModalOpen(true)}
              className="flex items-center gap-xs rounded-xl bg-primary px-md py-sm text-body-sm font-semibold text-white transition-all hover:bg-primary-hover shadow-sm"
            >
              <MaterialIcon name="manage_accounts" className="text-[20px]" />
              <span>Quản lý nhân sự</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
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
            {/* Tìm kiếm */}
            <div className="relative flex-1 max-w-xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
                <MaterialIcon name="search" className="text-[20px]" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tên, ID hoặc địa điểm..."
                className="w-full rounded-xl border border-slate-border/80 bg-white py-sm pl-[44px] pr-md text-body-sm text-on-surface placeholder-secondary/60 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-md text-slate-400 hover:text-slate-600"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                </button>
              )}
            </div>

            {/* Bộ lọc */}
            <div className="flex flex-wrap items-center gap-md">
              <div className="flex items-center gap-sm">
                <label htmlFor="location-filter" className="text-body-sm font-semibold text-secondary shrink-0">
                  Địa điểm:
                </label>
                <select
                  id="location-filter"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer min-w-[120px]"
                >
                  <option value="all">Tất cả</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <label htmlFor="status-filter" className="text-body-sm font-semibold text-secondary shrink-0">
                  Trạng thái:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer min-w-[120px]"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Đã khóa</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Khối danh sách */}
        <div className="flex flex-col space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-lg font-bold text-on-surface">Danh sách cơ sở</h2>
            <span className="text-body-sm text-secondary">Tìm thấy {filteredFacilities.length} kết quả</span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-secondary">Đang tải danh sách cơ sở...</div>
            </div>
          ) : (
            <FacilityTable
              facilities={filteredFacilities}
              onViewClick={handleViewClick}
              onEditClick={handleEditClick}
              onBlockToggle={handleBlockToggle}
            />
          )}
        </div>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-lg shadow-xl border border-slate-border/40">
              <div className="flex items-center justify-between border-b border-slate-border/60 pb-md">
                <div className="flex items-center gap-sm">
                  <MaterialIcon name="pending_actions" className="text-amber-600 text-[24px]" />
                  <h3 className="text-headline-md font-bold text-on-surface">Yêu cầu bổ sung nhân sự</h3>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="rounded-full p-xs text-secondary hover:bg-slate-100 transition-all"
                >
                  <MaterialIcon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="my-md space-y-md max-h-[400px] overflow-y-auto pr-xs">
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-md flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface text-body-md">Cơ sở Hòa Lạc</h4>
                    <p className="text-body-sm text-secondary mt-xs">Cần bổ sung: <span className="font-semibold text-amber-700">02 Staff</span></p>
                    <p className="text-[12px] italic text-slate-400 mt-2">"Lượng khách cuối tuần tăng cao, thiếu nhân viên ca tối."</p>
                  </div>
                  <div className="flex gap-xs shrink-0 self-end sm:self-center">
                    <button className="rounded-lg bg-emerald-600 px-sm py-xs text-[13px] font-medium text-white">Duyệt</button>
                    <button className="rounded-lg border border-slate-border bg-white px-sm py-xs text-[13px] font-medium text-secondary">Từ chối</button>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-md flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface text-body-md">Cơ sở Long Biên Gia Lâm</h4>
                    <p className="text-body-sm text-secondary mt-xs">Cần bổ sung: <span className="font-semibold text-amber-700">01 Manager</span></p>
                    <p className="text-[12px] italic text-slate-400 mt-2">"Quản lý cũ xin nghỉ thai sản, cần người điều phối thay thế."</p>
                  </div>
                  <div className="flex gap-xs shrink-0 self-end sm:self-center">
                    <button className="rounded-lg bg-emerald-600 px-sm py-xs text-[13px] font-medium text-white">Duyệt</button>
                    <button className="rounded-lg border border-slate-border bg-white px-sm py-xs text-[13px] font-medium text-secondary">Từ chối</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-border/60 pt-md">
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="rounded-xl border border-slate-border px-md py-sm text-body-sm font-semibold text-secondary hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
        {isDetailModalOpen && (
          <FacilityDetailModal
            facility={viewingFacilityDetail}
            loading={detailLoading}
            onClose={() => {
              setIsDetailModalOpen(false);
              setViewingFacilityId(null);
              setViewingFacilityDetail(null);
            }}
          />
        )}

        {isEditModalOpen && (
          <FacilityFormModal
            facility={editingFacility}
            saving={saving}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingFacility(null);
            }}
            onSubmit={handleEditSubmit}
          />
        )}

        {isGlobalAssignModalOpen && (
          <GlobalAssignStaffModal
            accounts={accounts}
            facilities={facilities}
            onClose={() => setIsGlobalAssignModalOpen(false)}
            onAccountUpdated={() => {
              loadData();
              loadAccounts();
            }}
          />
        )}

        {isConfirmOpen && confirmTarget && (
          <ConfirmModal
            isOpen={isConfirmOpen}
            title={!confirmTarget.isActive ? 'Mở khóa cơ sở' : 'Khóa cơ sở'}
            message={
              !confirmTarget.isActive
                ? `Bạn có chắc chắn muốn mở khóa cho cơ sở "${confirmTarget.name}" không? Cơ sở này sẽ hoạt động lại bình thường.`
                : `Cơ sở này đang có ${confirmTarget.staffCount} nhân viên. Bạn có chắc chắn muốn đóng cửa? Nhân viên sẽ tạm thời chuyển về trạng thái 'Chưa phân công'.`
            }
            confirmLabel={!confirmTarget.isActive ? 'Mở khóa' : 'Khóa'}
            cancelLabel="Hủy"
            confirmTone={!confirmTarget.isActive ? 'success' : 'error'}
            icon={!confirmTarget.isActive ? 'lock_open' : 'block'}
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

export default AdminFacilityManagement;
