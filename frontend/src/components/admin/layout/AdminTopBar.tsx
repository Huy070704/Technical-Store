import MaterialIcon from '../shared/MaterialIcon';

const AdminTopBar = () => {
  return (
    <header className="sticky top-0 z-50 bg-inverse-surface shadow-md">
      <div className="flex w-full items-center justify-between px-margin-mobile py-md md:px-margin-desktop">
        <div className="flex items-center gap-xl">
          <span className="text-headline-lg font-bold text-on-primary">TechStore</span>
          <nav className="hidden items-center gap-lg md:flex">
            {['Laptops', 'Desktops', 'Components', 'Accessories'].map((item) => (
              <a
                key={item}
                className="text-body-md text-on-tertiary-fixed-variant opacity-80 transition-colors hover:text-primary-light"
                href="#"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <button
            aria-label="Cart"
            className="rounded-lg p-xs text-primary transition-colors hover:bg-white/10 hover:text-primary-light"
            type="button"
          >
            <MaterialIcon name="shopping_cart" />
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

export default AdminTopBar;
