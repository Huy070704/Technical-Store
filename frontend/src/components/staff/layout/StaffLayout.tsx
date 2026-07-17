import type { ReactNode } from 'react';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import StaffTopBar from './StaffTopBar';
import { staffNavItems } from '../data/staffData';

type StaffLayoutProps = {
  children: ReactNode;
};

const StaffLayout = ({ children }: StaffLayoutProps) => {
  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col bg-bg-base">
      <StaffTopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AdminSidebar items={staffNavItems} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg-base p-margin-mobile md:p-margin-desktop">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
