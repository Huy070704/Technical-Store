import type { AdminNavItem } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';
import { NavLink } from 'react-router-dom';

type AdminSidebarProps = {
  items: AdminNavItem[];
};

// Các mục thống kê của manager sẽ được nhóm riêng
const STATS_PATHS = [
  '/manager/stats/revenue',
  '/manager/stats/orders',
  '/manager/stats/products',
  '/manager/stats/customers',
];

const AdminSidebar = ({ items }: AdminSidebarProps) => {
  // Tách nhóm: các mục thường và nhóm thống kê
  const mainItems = items.filter((item) => !STATS_PATHS.includes(item.path || ''));
  const statsItems = items.filter((item) => STATS_PATHS.includes(item.path || ''));

  const renderLink = (item: AdminNavItem) => (
    <NavLink
      key={item.path}
      to={item.path || '#'}
      className={({ isActive }) =>
        `admin-nav-link flex items-center gap-md rounded-lg px-md py-sm text-label-md transition-all duration-200 ${
          isActive || item.active
            ? 'bg-white/10 opacity-100 font-medium shadow-[inset_3px_0_0_0_#ffffff]'
            : 'opacity-80 hover:bg-white/5 hover:opacity-100'
        }`
      }
    >
      <MaterialIcon name={item.icon} />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <aside className="admin-sidebar hidden w-64 shrink-0 flex-col border-r border-slate-border/10 bg-inverse-surface text-on-primary md:flex overflow-hidden">
      <nav className="flex-1 overflow-y-auto space-y-xs px-md py-xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {/* Main navigation items */}
        {mainItems.map((item) => renderLink(item))}

        {/* Stats group separator (only for manager who has stats items) */}
        {statsItems.length > 0 && (
          <>
            <div className="px-md py-sm opacity-40">
              <div className="border-t border-white/20" />
            </div>
            <p className="px-md pb-xs text-label-xs font-bold uppercase tracking-widest opacity-50">
              Thống kê
            </p>
            {statsItems.map((item) => renderLink(item))}
          </>
        )}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
