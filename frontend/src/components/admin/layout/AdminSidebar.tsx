import type { AdminNavItem } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';

type AdminSidebarProps = {
  items: AdminNavItem[];
};

const AdminSidebar = ({ items }: AdminSidebarProps) => {
  return (
    <aside className="admin-sidebar hidden w-64 shrink-0 flex-col border-r border-slate-border/10 bg-inverse-surface text-on-primary md:flex">
      <nav className="flex-1 space-y-sm px-md py-xl">
        {items.map((item, index) => (
          <div key={item.label}>
            {index === items.length - 1 && (
              <div className="px-md pb-xl pt-lg opacity-40">
                <div className="border-t border-white/20" />
              </div>
            )}
            <a
              aria-current={item.active ? 'page' : undefined}
              className="admin-nav-link flex items-center gap-md rounded-lg px-md py-sm text-label-md transition-all hover:bg-white/10 hover:opacity-100"
              href="#"
            >
              <MaterialIcon name={item.icon} />
              <span>{item.label}</span>
            </a>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
