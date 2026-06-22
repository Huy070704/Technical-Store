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
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { useToast } from '@/contexts/ToastContext';
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

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Facility | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  useEffect(() => {
    loadData();
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
        <PageHeader
          description="Quản lý danh sách các cơ sở, thông tin liên hệ và trạng thái hoạt động."
          title="Quản Lý Cơ Sở"
        />

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

        {isConfirmOpen && confirmTarget && (
          <ConfirmModal
            isOpen={isConfirmOpen}
            title={!confirmTarget.isActive ? 'Mở khóa cơ sở' : 'Khóa cơ sở'}
            message={
              !confirmTarget.isActive
                ? `Bạn có chắc chắn muốn mở khóa cho cơ sở "${confirmTarget.name}" không? Cơ sở này sẽ hoạt động lại bình thường.`
                : `Bạn có chắc chắn muốn khóa cơ sở "${confirmTarget.name}" không? Cơ sở này sẽ bị tạm ngưng hoạt động.`
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
