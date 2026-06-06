import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import PageHeader from '@/components/admin/shared/PageHeader';
import type { ProductMetric } from '@/components/admin/types';

const metrics: ProductMetric[] = [
  {
    label: 'Pending Orders',
    value: '—',
    icon: 'pending_actions',
    tone: 'primary',
    meta: 'Cần xử lý',
    metaTone: 'danger',
  },
  {
    label: 'Deliveries Today',
    value: '—',
    icon: 'local_shipping',
    tone: 'secondary',
    meta: 'Hôm nay',
    metaTone: 'neutral',
  },
  {
    label: 'Open Invoices',
    value: '—',
    icon: 'receipt_long',
    tone: 'success',
    meta: 'Chưa thanh toán',
    metaTone: 'neutral',
  },
  {
    label: 'Pending Payments',
    value: '—',
    icon: 'payments',
    tone: 'neutral',
    meta: 'Chờ xác nhận',
    metaTone: 'neutral',
  },
];

type FeatureAction = {
  label: string;
  icon: string;
  path: string;
  tag?: string;
};

type FeatureGroup = {
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  path: string;
  actions: FeatureAction[];
};

const featureGroups: FeatureGroup[] = [
  {
    title: 'Quản lý đơn hàng Online',
    description: 'Xem, xác nhận và cập nhật trạng thái đơn hàng khách đặt online.',
    icon: 'shopping_bag',
    color: 'text-primary',
    bgColor: 'bg-primary-light',
    path: '/staff/orders',
    actions: [
      { label: 'Xem chi tiết đơn', icon: 'visibility',       path: '/staff/orders' },
      { label: 'Xác nhận đơn',     icon: 'check_circle',     path: '/staff/orders' },
      { label: 'Cập nhật trạng thái', icon: 'sync',          path: '/staff/orders' },
      { label: 'Hủy đơn',          icon: 'cancel',           path: '/staff/orders', tag: 'Có lý do' },
      { label: 'Giao hàng',        icon: 'local_shipping',   path: '/staff/orders' },
    ],
  },
  {
    title: 'Quản lý giao hàng',
    description: 'Theo dõi và xác nhận tình trạng giao vận, xuất hóa đơn giao hàng.',
    icon: 'local_shipping',
    color: 'text-secondary',
    bgColor: 'bg-secondary-fixed',
    path: '/staff/deliveries',
    actions: [
      { label: 'Theo dõi giao hàng', icon: 'location_on',    path: '/staff/deliveries' },
      { label: 'Xác nhận giao hàng', icon: 'task_alt',       path: '/staff/deliveries' },
      { label: 'Xuất hóa đơn giao',  icon: 'download',       path: '/staff/deliveries' },
    ],
  },
  {
    title: 'Bán hàng tại quầy',
    description: 'Tạo đơn mua trực tiếp, thu tiền còn lại và xử lý thanh toán.',
    icon: 'storefront',
    color: 'text-tertiary',
    bgColor: 'bg-tertiary-fixed',
    path: '/staff/instore',
    actions: [
      { label: 'Tạo đơn tại quầy',   icon: 'add_shopping_cart', path: '/staff/instore' },
      { label: 'Xử lý thanh toán',   icon: 'point_of_sale',     path: '/staff/instore' },
      { label: 'Thu tiền còn lại',   icon: 'account_balance_wallet', path: '/staff/instore' },
    ],
  },
  {
    title: 'Quản lý hóa đơn',
    description: 'Xem, tạo hóa đơn và xuất báo cáo tổng hợp theo ngày.',
    icon: 'receipt_long',
    color: 'text-on-surface',
    bgColor: 'bg-surface-container-highest',
    path: '/staff/invoices',
    actions: [
      { label: 'Xem chi tiết hóa đơn', icon: 'description',   path: '/staff/invoices' },
      { label: 'Tạo hóa đơn',          icon: 'add_circle',    path: '/staff/invoices' },
      { label: 'Tổng kết hóa đơn ngày',icon: 'bar_chart',     path: '/staff/invoices', tag: 'Daily' },
    ],
  },
  {
    title: 'Quản lý thanh toán',
    description: 'Kiểm tra trạng thái, xác nhận đặt cọc và thu tiền còn lại.',
    icon: 'payments',
    color: 'text-primary',
    bgColor: 'bg-primary-light',
    path: '/staff/payments',
    actions: [
      { label: 'Kiểm tra thanh toán', icon: 'manage_search',   path: '/staff/payments' },
      { label: 'Yêu cầu đặt cọc',    icon: 'request_quote',   path: '/staff/payments' },
      { label: 'Xác nhận đặt cọc',   icon: 'verified',        path: '/staff/payments' },
      { label: 'Thu tiền còn lại',    icon: 'account_balance_wallet', path: '/staff/payments' },
      { label: 'Xác nhận thanh toán', icon: 'check_circle',   path: '/staff/payments' },
    ],
  },
  {
    title: 'Xuất hàng',
    description: 'Quản lý và xác nhận xuất hàng hóa khỏi kho.',
    icon: 'output',
    color: 'text-secondary',
    bgColor: 'bg-secondary-fixed',
    path: '/staff/export',
    actions: [
      { label: 'Xuất hàng', icon: 'outbox', path: '/staff/export' },
    ],
  },
];

const FeatureCard = ({ group }: { group: FeatureGroup }) => {
  const navigate = useNavigate();

  return (
    <article className="flex flex-col rounded-xl border border-slate-border/50 bg-bg-card shadow-md transition-all hover:border-primary/30 hover:shadow-elevated">
      {/* Header */}
      <div className="flex items-center gap-md border-b border-slate-border/40 p-lg">
        <span className={`rounded-lg p-sm ${group.bgColor} ${group.color}`}>
          <MaterialIcon name={group.icon} />
        </span>
        <div>
          <h2 className="text-label-md font-semibold text-on-surface">{group.title}</h2>
          <p className="text-label-xs text-secondary">{group.description}</p>
        </div>
      </div>

      {/* Actions */}
      <ul className="flex flex-col gap-xs p-md">
        {group.actions.map((action) => (
          <li key={action.label}>
            <button
              type="button"
              onClick={() => navigate(action.path)}
              className="flex w-full items-center gap-sm rounded-lg px-sm py-sm text-left transition-colors hover:bg-surface-container-low active:scale-[0.99]"
            >
              <MaterialIcon
                name={action.icon}
                className="shrink-0 text-[18px] text-secondary"
              />
              <span className="flex-1 text-body-sm text-on-surface">{action.label}</span>
              {action.tag && (
                <span className="rounded-full bg-primary-light px-sm py-xs text-label-xs font-medium text-primary">
                  {action.tag}
                </span>
              )}
              <MaterialIcon name="chevron_right" className="text-[16px] text-secondary opacity-50" />
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-border/40 p-md">
        <button
          type="button"
          onClick={() => navigate(group.path)}
          className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
        >
          <MaterialIcon name="open_in_new" className="text-[16px]" />
          Mở trang
        </button>
      </div>
    </article>
  );
};

const StaffDashboard = () => {
  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Staff Dashboard"
          description="Tổng quan các chức năng quản lý của nhân viên."
        />

        {/* Metric cards */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {/* Feature groups */}
        <section>
          <h2 className="mb-md text-headline-lg font-bold text-on-surface">Chức năng chính</h2>
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
            {featureGroups.map((group) => (
              <FeatureCard key={group.title} group={group} />
            ))}
          </div>
        </section>
      </div>
    </StaffLayout>
  );
};

export default StaffDashboard;
