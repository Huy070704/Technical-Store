import MaterialIcon from '@/components/admin/shared/MaterialIcon';

const StaffTopBar = () => {
  return (
    <header className="sticky top-0 z-50 bg-inverse-surface shadow-md">
      <div className="flex w-full items-center justify-between px-margin-mobile py-md md:px-margin-desktop">
        <div className="flex items-center gap-xl">
          <span className="text-headline-lg font-bold text-on-primary">TechStore</span>
          <span className="hidden rounded-full bg-white/10 px-md py-xs text-label-md text-primary-light md:block">
            Staff Portal
          </span>
        </div>
        <div className="flex items-center gap-md">
          <button
            aria-label="Notifications"
            className="rounded-lg p-xs text-primary transition-colors hover:bg-white/10 hover:text-primary-light"
            type="button"
          >
            <MaterialIcon name="notifications" />
          </button>
          <button
            aria-label="Account"
            className="rounded-lg p-xs text-primary transition-colors hover:bg-white/10 hover:text-primary-light"
            type="button"
          >
            <MaterialIcon name="account_circle" filled />
          </button>
        </div>
      </div>
    </header>
  );
};

export default StaffTopBar;
