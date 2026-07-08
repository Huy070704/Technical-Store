import { useEffect, useMemo, useState } from 'react';
import { AdminLayout, PageHeader, MetricCard } from '@/components/admin';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import { useAuth } from '@/contexts/AuthContext';
import { adminAccountService } from '@/services/accountService';
import type { AuthUser } from '@/types/auth';
import type { ProductMetric } from '@/components/admin/types/admin';

const ITEMS_PER_PAGE = 10;

const ManagerStaffManagement = () => {
  const { user } = useAuth();

  const managerFacility = useMemo(() => {
    if (!user?.facility) return null;
    if (typeof user.facility === 'string') {
      return { id: user.facility, name: 'Cơ sở của bạn' };
    }
    return { id: user.facility.id, name: user.facility.name ?? 'Cơ sở của bạn' };
  }, [user?.facility]);

  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const allAccounts = await adminAccountService.getAllAccounts();
        setAccounts(allAccounts);
      } catch (err) {
        console.error(err);
        setError('Không thể tải danh sách tài khoản nhân viên.');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const staffMembers = useMemo(() => {
    if (!managerFacility) return [];
    return accounts.filter((account) => {
      // 1. Chỉ lấy tài khoản có vai trò là 'staff'
      const roleSlug = typeof account.role === 'object' ? account.role.slug : account.role;
      if (roleSlug !== 'staff') return false;

      // 2. Chỉ lấy nhân viên cùng cơ sở với manager
      const accountFacilityId = account.facility
        ? (typeof account.facility === 'object' ? account.facility.id || (account.facility as any)._id : account.facility)
        : null;

      return String(accountFacilityId) === String(managerFacility.id);
    });
  }, [accounts, managerFacility]);

  // Bộ lọc tìm kiếm
  const filteredStaff = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return staffMembers;
    return staffMembers.filter((staff) =>
      (staff.name || '').toLowerCase().includes(query) ||
      (staff.email || '').toLowerCase().includes(query) ||
      (staff.phone || '').toLowerCase().includes(query)
    );
  }, [staffMembers, searchTerm]);

  // Pagination
  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const metrics: ProductMetric[] = useMemo(() => {
    const total = staffMembers.length;
    const active = staffMembers.filter(s => !s.isBlocked).length;
    const blocked = staffMembers.filter(s => s.isBlocked).length;

    return [
      {
        label: 'Tổng nhân sự cơ sở',
        value: total.toString(),
        icon: 'groups',
        tone: 'primary',
        meta: managerFacility?.name ?? 'Cơ sở của bạn',
        metaTone: 'neutral',
      },
      {
        label: 'Đang hoạt động',
        value: active.toString(),
        icon: 'check_circle',
        tone: 'success',
        meta: 'Đang làm việc',
        metaTone: 'success',
      },
      {
        label: 'Bị khóa/Tạm dừng',
        value: blocked.toString(),
        icon: 'block',
        tone: 'secondary',
        meta: 'Đang bị khóa',
        metaTone: 'danger',
      },
    ];
  }, [staffMembers, managerFacility]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản Lý Nhân Sự"
          description={
            managerFacility?.name
              ? `Xem danh sách nhân viên thuộc cơ sở: ${managerFacility.name}.`
              : 'Xem danh sách nhân viên thuộc cơ sở của bạn.'
          }
        />

        {managerFacility && (
          <div className="flex items-center gap-sm rounded-xl border border-primary/20 bg-primary/5 px-md py-sm w-fit">
            <MaterialIcon name="store" className="text-primary text-[18px]" />
            <span className="text-body-sm font-semibold text-primary">
              Cơ sở: <span className="font-bold">{managerFacility.name}</span>
            </span>
          </div>
        )}

        <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {error && (
          <div className="rounded-lg bg-error-container p-4 text-error">
            {error}
          </div>
        )}

        {/* Thanh tìm kiếm */}
        <div className="w-full rounded-2xl border border-slate-border/30 bg-bg-card p-md shadow-sm transition-all duration-300">
          <div className="relative flex-1 max-w-xl">
            <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
              <MaterialIcon name="search" className="text-[20px]" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm nhân viên theo họ tên, email, SĐT..."
              className="w-full rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white py-sm pl-[44px] pr-md text-body-sm text-on-surface placeholder-secondary/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        </div>

        {/* Bảng danh sách */}
        <div className="flex flex-col space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-lg font-bold text-on-surface">Danh sách nhân viên</h2>
            <span className="text-body-sm text-secondary">Tìm thấy {totalItems} nhân sự</span>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-border bg-bg-soft">
                    {['Họ tên', 'Email', 'Số điện thoại', 'Trạng thái'].map((header) => (
                      <th
                        key={header}
                        className="px-lg py-md text-label-md uppercase text-secondary"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-lg py-xl text-center text-body-sm text-secondary">
                        Đang tải danh sách nhân sự...
                      </td>
                    </tr>
                  ) : currentStaff.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-lg py-xl text-center text-body-sm text-secondary">
                        Không tìm thấy nhân viên nào thuộc cơ sở này.
                      </td>
                    </tr>
                  ) : (
                    currentStaff.map((staff) => {
                      const isBlocked = !!staff.isBlocked;
                      const isActive = staff.isRegistered !== false;

                      let statusText = 'Đang chờ';
                      let statusColor = 'bg-slate-400';
                      if (isBlocked) {
                        statusText = 'Đã khóa';
                        statusColor = 'bg-error';
                      } else if (isActive) {
                        statusText = 'Hoạt động';
                        statusColor = 'bg-success';
                      }

                      return (
                        <tr key={staff.accountId || staff.email} className="transition-colors hover:bg-surface-container-low">
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-md">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                                <MaterialIcon name="person" />
                              </div>
                              <div>
                                <div className="text-label-md text-on-surface">{staff.name || 'Chưa cập nhật'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-lg py-md text-body-sm text-on-surface">{staff.email}</td>
                          <td className="px-lg py-md text-body-sm text-on-surface">{staff.phone || 'Chưa cập nhật'}</td>
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-xs">
                              <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                              <span className="text-label-md text-on-surface">{statusText}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && totalPages > 1 && (
              <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
                <span className="text-body-sm text-secondary">
                  Hiển thị từ {indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, totalItems)} trong tổng số {totalItems} nhân sự
                </span>

                <div className="flex items-center gap-xs">
                  <button
                    aria-label="Trang trước"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                    type="button"
                  >
                    <MaterialIcon name="chevron_left" />
                  </button>

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

                  <button
                    aria-label="Trang sau"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                    type="button"
                  >
                    <MaterialIcon name="chevron_right" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerStaffManagement;
