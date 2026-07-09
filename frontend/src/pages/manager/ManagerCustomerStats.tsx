import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  statisticsService,
  type ManagerDetailedStats,
} from '@/services/statisticsService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ManagerCustomerStats = () => {
  const toast = useToast();
  const { user } = useAuth();

  const facilityName = useMemo(() => {
    if (!user?.facility) return null;
    if (typeof user.facility === 'object' && user.facility !== null) {
      return (user.facility as { id: string; name?: string }).name ?? null;
    }
    return null;
  }, [user]);

  const [managerStats, setManagerStats] = useState<ManagerDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const managerData = await statisticsService.getManagerDetailedStats();
      setManagerStats(managerData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu khách hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await statisticsService.exportManagerStats('customers');
      toast.success('Xuất báo cáo khách hàng thành công!');
    } catch {
      toast.error('Không thể xuất báo cáo khách hàng.');
    } finally {
      setExporting(false);
    }
  };

  const customerStats = useMemo(() => {
    if (!managerStats) return { total: 0, newCust: 0, returningCust: 0, returningPercent: 0 };
    const { total, newLast30Days, returning } = managerStats.customerBreakdown;
    const returningPercent = total > 0 ? Math.round((returning / total) * 100) : 0;
    return { total, newCust: newLast30Days, returningCust: returning, returningPercent };
  }, [managerStats]);

  const topPurchasingCustomers = useMemo(() => {
    if (!managerStats?.topCustomers) return [];
    const customers = managerStats.topCustomers.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      count: c.orderCount,
      total: c.totalSpent,
    }));
    if (!customerSearch) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [managerStats, customerSearch]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card shadow-sm animate-pulse">
          <div className="flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
            <div className="text-secondary font-semibold">Đang tải dữ liệu khách hàng...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-error/20 bg-error-container/20 p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-error">warning</span>
          <p className="mt-md text-error font-medium">{error}</p>
          <button onClick={() => void fetchData()} className="mt-lg bg-primary text-white text-label-md px-lg py-sm rounded hover:bg-primary-hover font-bold transition-all">
            Thử lại
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-lg mx-auto max-w-7xl pb-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-bg-card p-lg rounded-xl shadow-sm border border-slate-border">
          <div>
            <div className="flex items-center gap-sm text-primary font-bold text-body-sm">
              <MaterialIcon name="group" className="text-[18px]" />
              THỐNG KÊ KHÁCH HÀNG
              {facilityName && (
                <span className="ml-xs px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold border border-primary/20">
                  <MaterialIcon name="store" className="text-[13px] align-middle mr-0.5" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Thống kê Khách hàng</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Chân dung khách hàng tại cơ sở: ${facilityName}`
                : 'Theo dõi số lượng khách mới, khách quay lại và chân dung các khách hàng mua nhiều nhất.'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary text-on-primary text-label-md px-lg py-2.5 rounded-lg font-semibold hover:bg-primary-hover hover:shadow-md active:scale-[0.98] flex items-center gap-xs transition-all duration-200 disabled:opacity-60"
          >
            <MaterialIcon name={exporting ? 'sync' : 'file_download'} className={exporting ? 'animate-spin' : ''} />
            {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo Khách Hàng'}
          </button>
        </header>

        {/* KPI Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
            <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Tổng Khách Hàng</p>
            <h2 className="text-headline-lg font-bold text-on-surface mt-1">{customerStats.total.toLocaleString('vi-VN')}</h2>
          </div>
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
            <p className="text-label-xs font-bold text-primary uppercase tracking-wider">Khách Mới (30 ngày)</p>
            <h2 className="text-headline-lg font-bold text-primary mt-1">{customerStats.newCust.toLocaleString('vi-VN')}</h2>
          </div>
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
            <p className="text-label-xs font-bold text-tertiary uppercase tracking-wider">Khách Quay Lại</p>
            <h2 className="text-headline-lg font-bold text-tertiary mt-1">{customerStats.returningPercent}%</h2>
            <p className="text-label-xs text-secondary mt-xs">{customerStats.returningCust} khách quay lại</p>
          </div>
        </section>

        {/* Summary Customer Cards & Top Customer Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Customer Breakdown ratios */}
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between h-fit gap-lg">
            <div>
              <h3 className="text-body-md font-bold mb-sm">Phân Loại Khách Hàng</h3>
              <p className="text-body-xs text-secondary">Tỷ lệ tương quan giữa khách cũ và khách mới.</p>
            </div>
            <div className="flex flex-col items-center justify-center py-md">
              <div className="relative w-36 h-36 rounded-full border-[14px] border-slate-100 flex items-center justify-center">
                <div className="absolute inset-[-14px] rounded-full border-[14px] border-primary border-r-transparent border-b-transparent rotate-[45deg]"></div>
                <div className="text-center">
                  <span className="block text-headline-xl font-bold">{customerStats.returningPercent}%</span>
                  <span className="text-label-xs text-secondary">Quay lại</span>
                </div>
              </div>
            </div>
            <div className="space-y-sm border-t border-slate-border/30 pt-md">
              <div className="flex justify-between text-body-xs font-semibold">
                <span className="text-secondary flex items-center gap-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Khách hàng quay lại
                </span>
                <span>{customerStats.returningCust}</span>
              </div>
              <div className="flex justify-between text-body-xs font-semibold">
                <span className="text-secondary flex items-center gap-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Khách hàng mới
                </span>
                <span>{customerStats.newCust}</span>
              </div>
            </div>
          </div>

          {/* Top Purchasing Table */}
          <div className="lg:col-span-2 bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-lg border-b border-slate-border/40 flex flex-col md:flex-row md:items-center justify-between gap-sm">
              <div>
                <h3 className="text-body-md font-bold text-primary">Khách Hàng Mua Nhiều Nhất</h3>
                <p className="text-body-xs text-secondary">Những khách hàng đóng góp doanh thu lớn nhất cho cửa hàng.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Tìm tên hoặc email khách..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-border bg-bg-card rounded-lg text-body-sm outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                  <tr>
                    <th className="px-lg py-3">#</th>
                    <th className="px-lg py-3">Họ và Tên</th>
                    <th className="px-lg py-3">Email</th>
                    <th className="px-lg py-3">Số Điện Thoại</th>
                    <th className="px-lg py-3 text-right">Số Đơn</th>
                    <th className="px-lg py-3 text-right">Tổng Mua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border/20 text-body-sm">
                  {topPurchasingCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-lg py-8 text-center text-secondary">
                        Chưa có dữ liệu khách hàng mua hàng.
                      </td>
                    </tr>
                  ) : topPurchasingCustomers.map((cust, idx) => (
                    <tr key={cust.email || idx} className="hover:bg-slate-50/30">
                      <td className="px-lg py-4 font-bold text-secondary">
                        {idx < 3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-label-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-slate-100 text-slate-600' :
                            'bg-orange-100 text-orange-700'
                          }`}>{idx + 1}</span>
                        ) : idx + 1}
                      </td>
                      <td className="px-lg py-4 font-semibold text-on-surface">{cust.name}</td>
                      <td className="px-lg py-4 text-secondary">{cust.email}</td>
                      <td className="px-lg py-4 text-secondary">{cust.phone || '—'}</td>
                      <td className="px-lg py-4 text-right">{cust.count} đơn</td>
                      <td className="px-lg py-4 text-right font-mono font-bold text-primary">{formatVND(cust.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerCustomerStats;
