import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import { adminNavItems } from '../data/adminData';

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <AdminTopBar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar items={adminNavItems} />
        <main className="flex-1 overflow-y-auto bg-bg-base p-margin-mobile md:p-margin-desktop">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
