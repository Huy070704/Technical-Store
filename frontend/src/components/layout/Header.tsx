import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { productService } from '@/services/productService';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userDropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = user?.name ?? user?.email ?? 'Tài khoản';

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      navigate('/all-products', { state: { clearFilter: true } });
      setSearchValue('');
      return;
    }
    setIsSearching(true);
    try {
      const results = await productService.searchProducts(searchValue.trim());
      const activeResults = Array.isArray(results)
        ? results.filter((p) => p.isActive)
        : [];
      navigate('/all-products', {
        state: {
          searchResults: activeResults,
          searchKeyword: searchValue.trim(),
        },
      });
      setSearchValue('');
    } catch (error) {
      console.error('Search error:', error);
      navigate('/all-products', {
        state: { searchKeyword: searchValue.trim() },
      });
      setSearchValue('');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    void logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const handleFilter = (filter: string) => {
    setMobileMenuOpen(false);
    navigate('/all-products', { state: { filter } });
  };

  return (
    <header className="fixed top-0 right-0 h-[95px] bg-white border-b border-slate-border z-40 w-full shadow-sm">
      <div className="w-full h-full">
        <div className="h-full w-full flex items-center gap-4 md:gap-6 pl-[30px] pr-4 md:pr-8 lg:pr-12 xl:pr-16">
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/img/lo.png"
              alt="TechnicalStore"
              className="h-[80px] w-[200px] mr-[60px] object-contain"
            />
          </Link>

          <div className="hidden md:flex flex-1 justify-center min-w-0 px-2 lg:px-8">
            <div className="relative w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl">
              <form onSubmit={handleSearch} className="relative w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-2xl">
                  search
                </span>
                <input
                  className="w-full pl-12 pr-5 py-3 bg-surface-container-low border-none rounded-full text-body-md focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="Tìm sản phẩm bạn mong muốn..."
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  disabled={isSearching}
                />
              </form>
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-7 shrink-0 ml-auto">
            <button
              type="button"
              className="lg:hidden p-3 hover:bg-surface-container-high rounded-full transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="material-symbols-outlined text-on-surface text-[32px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <div className="relative p-3 text-on-surface hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[36px]">notifications</span>
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full" />
            </div>

            <Link
              to="/cart"
              className="relative p-3 hover:bg-surface-container-high rounded-full transition-all no-underline text-on-surface"
            >
              <span className="material-symbols-outlined text-[36px]">shopping_bag</span>
              <span className="absolute top-0.5 right-0.5 w-6 h-6 text-[11px] text-white bg-primary rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            </Link>

            <div
              className="relative"
              onMouseEnter={() => {
                if (userDropdownTimeout.current) {
                  clearTimeout(userDropdownTimeout.current);
                }
                setUserDropdownOpen(true);
              }}
              onMouseLeave={() => {
                userDropdownTimeout.current = setTimeout(
                  () => setUserDropdownOpen(false),
                  150,
                );
              }}
            >
              {isAuthenticated() ? (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0"
                  >
                    <span className="material-symbols-outlined text-[36px]">person</span>
                    <div className="flex flex-col text-sm font-bold leading-tight text-left">
                      <span className="truncate max-w-[100px]">{displayName}</span>
                      <span>Tài khoản</span>
                    </div>
                  </button>
                  {userDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-slate-border rounded-xl shadow-xl min-w-[180px] py-2 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/user/details');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">account_circle</span>
                        Tài khoản
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/order-history');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                        Đơn hàng
                      </button>
                      <div className="border-t border-slate-border my-1" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-primary-light transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors no-underline bg-transparent border-none p-0"
                >
                  <span className="material-symbols-outlined text-[36px]">person</span>
                  <div className="flex flex-col text-sm font-bold leading-tight text-left">
                    <span>Tài</span>
                    <span>khoản</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-[95px] left-0 w-full bg-white border-b border-slate-border shadow-lg lg:hidden z-50">
          <div className="p-4">
            <form onSubmit={handleSearch} className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-xl">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-full text-body-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Tìm sản phẩm..."
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                disabled={isSearching}
              />
            </form>
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleFilter('laptop')}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
              >
                Laptop
              </button>
              <button
                type="button"
                onClick={() => handleFilter('pc')}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
              >
                PC Sets
              </button>
              <button
                type="button"
                onClick={() => handleFilter('accessories')}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
              >
                Linh kiện
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/all-products', { state: { clearFilter: true } });
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
              >
                Tất cả sản phẩm
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/request-for-quota');
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary-light transition-colors"
              >
                BUILD PC
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/order-history');
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors"
              >
                Đơn hàng
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
