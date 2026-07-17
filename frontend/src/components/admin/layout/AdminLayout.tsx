import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import { adminNavItems } from '../data/adminData';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleName } from '@/services/authService';
import { useMemo } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user } = useAuth();
  const roleName = getRoleName(user)?.toLowerCase() ?? '';

  const navItems = useMemo(
    () =>
      adminNavItems.filter(
        (item) => !item.roles || item.roles.includes(roleName)
      ),
    [roleName]
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col bg-bg-base">
      <AdminTopBar />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar items={navItems} />
        <main className="relative z-10 min-w-0 flex-1 overflow-y-auto bg-bg-base p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
