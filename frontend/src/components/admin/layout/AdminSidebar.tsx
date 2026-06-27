import type { AdminNavItem } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';
import { NavLink } from 'react-router-dom';

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
            <NavLink
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
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
