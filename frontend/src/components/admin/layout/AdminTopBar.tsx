import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MaterialIcon from '../shared/MaterialIcon';
import { useAuth } from '@/contexts/AuthContext';

const AdminTopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = user?.name ?? user?.email ?? 'Admin';

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-inverse-surface/90 backdrop-blur-md shadow-sm border-b border-white/5">
      <div className="flex w-full items-center justify-between px-margin-mobile py-md md:px-margin-desktop">
        <div className="flex items-center gap-xl">
          <span className="text-headline-lg font-bold text-on-primary">TechStore</span>
         
        </div>
        <div className="flex items-center gap-md">
          <div
            className="relative"
            onMouseEnter={() => {
              if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
              setDropdownOpen(true);
            }}
            onMouseLeave={() => {
              dropdownTimeout.current = setTimeout(() => setDropdownOpen(false), 150);
            }}
          >
            <button
              aria-label="Account"
              className="flex items-center gap-2 rounded-lg p-xs text-primary transition-all duration-200 hover:bg-white/10 hover:text-primary-light active:scale-[0.98] border-none bg-transparent cursor-pointer"
              type="button"
            >
              <MaterialIcon name="account_circle" filled />
              <span className="text-body-md font-bold max-w-[150px] truncate">
                {displayName}
              </span>
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-bg-card border border-slate-border/50 shadow-elevated py-2 z-50 animate-fadeInUp">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error-container transition-colors"
                >
                  <MaterialIcon name="logout" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
