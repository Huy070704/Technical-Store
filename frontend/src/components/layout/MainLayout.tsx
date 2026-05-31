import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const MainLayout = () => (
  <div className="min-h-screen bg-bg-base text-on-surface">
    <Header />
    <Outlet />
  </div>
);
