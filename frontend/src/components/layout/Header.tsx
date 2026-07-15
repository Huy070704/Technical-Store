import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { productService } from '@/services/productService';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { items } = useCart();
  const { wishlistCount } = useWishlist();
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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    const first = parts[0][0] ?? '';
    const last = parts[parts.length - 1][0] ?? '';
    return (first + last).toUpperCase();
  };

  const getShortName = (name: string) => {
    if (!name) return 'Tài khoản';
    if (name.includes('@')) return name.split('@')[0];
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1];
  };

  return (
    <header className="fixed top-0 right-0 h-[95px] bg-white border-b border-slate-100 z-40 w-full shadow-sm flex flex-col justify-between">
      {/* Top Utility Bar (h-[30px]) */}
      <div className="h-[30px] w-full bg-slate-50/85 border-b border-slate-100/50 flex items-center justify-between px-4 md:px-8 lg:px-12 xl:px-16 text-[12px] text-slate-500 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-slate-400">local_shipping</span>
            Giao hàng nhanh toàn quốc
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
            Hotline: <strong className="text-slate-700 font-semibold">1800 6868</strong>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/contact" className="hover:text-primary transition-colors no-underline text-slate-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-slate-400">storefront</span>
            Hệ thống cửa hàng
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/guest-order-lookup" className="hover:text-primary transition-colors no-underline text-slate-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-slate-400">search_check</span>
            Tra cứu đơn hàng
          </Link>
        </div>
      </div>

      {/* Main Header Bar (h-[65px]) */}
      <div className="h-[65px] w-full flex items-center justify-between pl-4 pr-4 md:pl-[30px] md:pr-8 lg:pr-12 xl:pr-16 gap-4 md:gap-6 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="lg:hidden p-2 hover:bg-slate-100 rounded-full transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-slate-700 text-[26px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          <Link to="/" className="flex items-center shrink-0 hover:scale-[1.02] transition-transform duration-200">
            <img
              src="/img/lo.png"
              alt="TechnicalStore"
              className="h-[40px] md:h-[45px] w-auto object-contain"
            />
          </Link>
        </div>

        {/* Search Box */}
        <div className="hidden md:flex flex-1 justify-center min-w-0 max-w-xl lg:max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full pl-11 pr-5 py-2 bg-slate-50 border border-primary/25 hover:border-primary/50 rounded-full text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200 outline-none"
              placeholder="Tìm sản phẩm bạn mong muốn..."
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              disabled={isSearching}
            />
          </form>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 md:gap-5 shrink-0">
          <Link
            to="/wishlist"
            className="relative p-2 hover:bg-slate-50 rounded-full transition-all no-underline text-slate-700 hover:text-primary flex items-center justify-center"
            aria-label="Danh sách yêu thích"
          >
            <span className="material-symbols-outlined text-[26px]">favorite</span>
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] text-white bg-primary rounded-full flex items-center justify-center font-bold border-2 border-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            to="/cart"
            className="relative p-2 hover:bg-slate-50 rounded-full transition-all no-underline text-slate-700 hover:text-primary flex items-center justify-center"
            aria-label="Giỏ hàng"
          >
            <span className="material-symbols-outlined text-[26px]">shopping_bag</span>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] text-white bg-primary rounded-full flex items-center justify-center font-bold border-2 border-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Account Dropdown */}
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
                  onClick={() => navigate('/user/details')}
                  className="flex items-center gap-2 text-slate-700 hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-1 rounded-full hover:bg-slate-50 outline-none"
                >
                  <div className="w-[34px] h-[34px] rounded-full bg-primary text-white flex items-center justify-center text-[13px] font-bold shadow-sm">
                    {getInitials(displayName)}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-[13px] font-semibold leading-none text-slate-800 max-w-[85px] truncate">
                      Hi, {getShortName(displayName)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-none font-medium">Tài khoản</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-lg hidden lg:inline">expand_more</span>
                </button>
                {userDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-[11px] text-slate-400 font-medium m-0 leading-none">Xin chào,</p>
                      <p className="text-[13px] font-semibold text-slate-800 truncate m-0 mt-1 leading-tight">{displayName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/user/details');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 rounded-lg border-none bg-transparent cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">account_circle</span>
                      Thông tin cá nhân
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/order-history');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 rounded-lg border-none bg-transparent cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">receipt_long</span>
                      Lịch sử đơn hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/my-feedbacks');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 rounded-lg border-none bg-transparent cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">feedback</span>
                      Phản hồi của tôi
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-[13px] text-primary hover:bg-primary-light/50 transition-colors flex items-center gap-2.5 rounded-lg border-none bg-transparent cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-lg text-primary">logout</span>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 text-slate-700 hover:text-primary transition-colors no-underline bg-transparent border-none p-1 rounded-full hover:bg-slate-50"
              >
                <div className="w-[34px] h-[34px] rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[13px] font-semibold leading-none text-slate-800">Đăng nhập</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-none font-medium">Tài khoản</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-[95px] left-0 w-full bg-white border-b border-slate-100 shadow-lg lg:hidden z-50 animate-fadeInUp">
          <div className="p-4">
            <form onSubmit={handleSearch} className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-primary/25 hover:border-primary/50 rounded-full text-[13px] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
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
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer text-slate-800"
              >
                <span>💻 Laptop</span>
                <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilter('pc')}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer text-slate-800"
              >
                <span>🖥️ PC Sets</span>
                <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilter('accessories')}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer text-slate-800"
              >
                <span>🖱️ Linh kiện</span>
                <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/all-products', { state: { clearFilter: true } });
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer text-slate-800"
              >
                <span>📦 Tất cả sản phẩm</span>
                <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/request-for-quota');
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary-light/50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer"
              >
                <span>🛠️ BUILD PC</span>
                <span className="material-symbols-outlined text-sm text-primary">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/order-history');
                }}
                className="text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-none bg-transparent cursor-pointer text-slate-800"
              >
                <span>📋 Đơn hàng của tôi</span>
                <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

