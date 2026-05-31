import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { BrowseProductCard } from '@/components/product/BrowseProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';

// Banner slides
const promoSlides = [
  { id: 1, image: "/img/slide%201.png" },
  { id: 2, image: "/img/slide%202.jpg" },
  { id: 3, image: "/img/slide%203.jpg" },
  { id: 4, image: "/img/ctnen.png" },
  { id: 5, image: "/img/pc.jpg" },
  { id: 6, image: "/img/pc.png" },
];

// Category definitions (id = unique React key; filter = route filter state)
const categories = [
  { id: "laptop", name: "Laptop", icon: "laptop", filter: "laptop" },
  { id: "pc", name: "PC Sets", icon: "desktop_windows", filter: "pc" },
  { id: "components", name: "Linh kiện", icon: "memory", filter: "accessories" },
  { id: "monitor", name: "Màn hình", icon: "monitor", filter: "monitor" },
  { id: "peripherals", name: "Phụ kiện", icon: "mouse", filter: "accessories" },
  { id: "gaming", name: "Gaming", icon: "headset", filter: "gaming" },
  { id: "printer", name: "Máy in", icon: "print", filter: "printer" },
  { id: "network", name: "Mạng", icon: "router", filter: "network" },
];

// Helper to determine discount percentage to show badge
const getProductDiscount = (product: Product): number => {
  const name = product.name.toLowerCase();
  if (name.includes("macbook")) return 20;
  if (name.includes("bàn phím") || name.includes("logitech")) return 18;
  if (name.includes("card đồ họa") || name.includes("asus")) return 18;
  return 0;
};

// Helper to calculate old price struck through
const getOldPrice = (product: Product): number => {
  const discount = getProductDiscount(product);
  if (discount > 0) {
    if (product.name.toLowerCase().includes("macbook")) {
      if (Math.abs(product.price - 47990000) < 1000000) return 59890000;
      if (Math.abs(product.price - 82490000) < 1000000) return 85990000;
    }
    // General formula: round to nearest 10,000 and subtract 10,000 for realistic pricing
    const rawOld = product.price / (1 - discount / 100);
    return Math.round(rawOld / 10000) * 10000 - 10000;
  }
  return 0;
};

export const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, clearCart } = useCart();
  const { user, token } = useAuth();

  // Data states
  const [newProducts, setNewProducts] = useState<{
    laptops: Product[];
    pcs: Product[];
    accessories: Product[];
  }>({ laptops: [], pcs: [], accessories: [] });
  const [topSellingProducts, setTopSellingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [addToCartStatus, setAddToCartStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Banner slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play slider
  useEffect(() => {
    sliderTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => {
      if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
    };
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
    sliderTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % promoSlides.length);
  const prevSlide = () =>
    goToSlide(
      (currentSlide - 1 + promoSlides.length) % promoSlides.length
    );

  // Debug auth state - FIXED: Remove isAuthenticated function from dependencies
  useEffect(() => {}, [user, token]);

  // Handle payment success messages from PayOS
  useEffect(() => {
    const state = location.state as {
      paymentSuccess?: boolean;
      message?: string;
    } | null;
    let shouldClear = false;
    if (state && state.paymentSuccess && state.message) {
      setPaymentSuccessMessage(state.message);
      shouldClear = true;
      navigate(location.pathname, { replace: true });
    } else {
      const msg = sessionStorage.getItem("paymentSuccessMessage");
      if (msg) {
        setPaymentSuccessMessage(msg);
        shouldClear = true;
        sessionStorage.removeItem("paymentSuccessMessage");
      }
    }
    const codSuccessMsg = sessionStorage.getItem("codSuccessMessage");
    if (codSuccessMsg) {
      setPaymentSuccessMessage(codSuccessMsg);
      shouldClear = true;
      sessionStorage.removeItem("codSuccessMessage");
    }
    if (shouldClear) {
      clearCart();
    }
  }, [location, navigate, clearCart]);

  // Auto-hide payment success message
  useEffect(() => {
    if (paymentSuccessMessage) {
      const timer = setTimeout(() => setPaymentSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccessMessage]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [newProductsData, topSellingData] = await Promise.all([
          productService.getNewProducts(8),
          productService.getTopSellingProducts(8),
        ]);
        setNewProducts(newProductsData);
        setTopSellingProducts(
          Array.isArray(topSellingData) ? topSellingData : []
        );
      } catch (error) {
        setNewProducts({ laptops: [], pcs: [], accessories: [] });
        setTopSellingProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helpers
  const formatPrice = (price: number): string =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const getProductImage = (product: Product): string => {
    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }
    const categoryName = product.category?.name?.toLowerCase() || "";
    if (categoryName.includes("laptop")) return "/img/product01.png";
    if (categoryName.includes("pc")) return "/img/product02.png";
    if (categoryName.includes("monitor")) return "/img/product03.png";
    if (categoryName.includes("keyboard")) return "/img/product04.png";
    if (categoryName.includes("mouse")) return "/img/product05.png";
    if (categoryName.includes("headset")) return "/img/product06.png";
    if (categoryName.includes("cpu")) return "/img/product07.png";
    if (categoryName.includes("gpu")) return "/img/product08.png";
    if (categoryName.includes("ram")) return "/img/product09.png";
    return "/img/product01.png";
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/product/${product.id}`, { state: { from: "home" } });
  };

  const handleAddToCart = async (product: Product, quantity = 1) => {
    if (!product.id) {
      setAddToCartStatus({ message: "Sản phẩm không hợp lệ", type: "error" });
      setTimeout(() => setAddToCartStatus(null), 3000);
      return;
    }
    try {
      await addToCart(product.id, quantity);
      setAddToCartStatus({
        message: "Đã thêm vào giỏ hàng!",
        type: "success",
      });
      setTimeout(() => setAddToCartStatus(null), 3000);
    } catch (error) {
      setAddToCartStatus({
        message: "Lỗi khi thêm vào giỏ hàng",
        type: "error",
      });
      setTimeout(() => setAddToCartStatus(null), 3000);
    }
  };

  // Get all featured products (combine all categories)
  const getFeaturedProducts = (): Product[] => {
    const all = [
      ...(newProducts.laptops || []),
      ...(newProducts.pcs || []),
      ...(newProducts.accessories || []),
    ];
    
    // Sort so mockup items are first if available
    const macbook = all.find(p => p.name.toLowerCase().includes("macbook"));
    const keyboard = all.find(p => p.name.toLowerCase().includes("bàn phím") || p.name.toLowerCase().includes("keyboard"));
    const monitor = all.find(p => p.name.toLowerCase().includes("màn hình") || p.name.toLowerCase().includes("monitor"));
    const gpu = all.find(p => p.name.toLowerCase().includes("card đồ họa") || p.name.toLowerCase().includes("vga") || p.name.toLowerCase().includes("rtx"));
    const headset = all.find(p => p.name.toLowerCase().includes("tai nghe") || p.name.toLowerCase().includes("sony") || p.name.toLowerCase().includes("wh-1000"));

    const result: Product[] = [];
    if (macbook) result.push(macbook);
    if (keyboard) result.push(keyboard);
    if (monitor) result.push(monitor);
    if (gpu) result.push(gpu);
    if (headset) result.push(headset);

    // Fill with remaining products up to 5
    for (const p of all) {
      if (result.length >= 5) break;
      if (!result.some(r => r.id === p.id)) {
        result.push(p);
      }
    }
    return result;
  };

  // Loading state
  if (loading) {
    return (
      <main className="pt-[95px] min-h-screen bg-bg-base">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin mb-4 block">
              progress_activity
            </span>
            <p className="text-secondary text-body-md">
              Đang tải sản phẩm...
            </p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const featuredProducts = getFeaturedProducts();
  const heroProduct = featuredProducts[0];
  const gridProducts = featuredProducts.slice(1, 5);

  return (
    <main className="pt-[95px] min-h-screen bg-bg-base">
      {/* Toast Notifications */}
      {addToCartStatus && (
        <div
          className={`fixed top-[95px] right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm transition-all ${
            addToCartStatus.type === "success"
              ? "bg-tertiary"
              : "bg-primary"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              {addToCartStatus.type === "success"
                ? "check_circle"
                : "error"}
            </span>
            {addToCartStatus.message}
          </div>
        </div>
      )}
      {paymentSuccessMessage && (
        <div className="fixed top-[95px] left-1/2 -translate-x-1/2 z-50 bg-tertiary text-white px-6 py-4 rounded-xl shadow-xl max-w-md w-[90%] text-center">
          <div className="flex items-center justify-center gap-2 mb-2 font-bold">
            <span className="material-symbols-outlined">
              check_circle
            </span>
            {paymentSuccessMessage}
          </div>
          <button
            onClick={() => setPaymentSuccessMessage(null)}
            className="text-white/80 text-xs hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="w-full px-3 md:px-4 py-4 md:pt-lg md:pb-[10px]">
        {/* ===== HERO BANNER SLIDER ===== */}
        <section className="mb-xl relative rounded-2xl overflow-hidden h-[300px] md:h-[450px] lg:h-[500px] shadow-xl group">
          {/* Slides */}
          {promoSlides.map((slide, index) => (
            <img
              key={slide.id}
              alt={`Promo banner ${slide.id}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
              src={slide.image}
            />
          ))}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-6 md:p-xl pb-[60px]">
            <div className="max-w-2xl flex flex-wrap text-right ml-[50px]">
              <span className="bg-white/20 backdrop-blur-md text-white text-label-xs font-bold px-4 py-1.5 rounded-full mb-md inline-block">
                CÔNG NGHỆ MỚI 2024
              </span>
              <h1 className="text-white font-bold text-2xl md:text-4xl lg:text-5xl mb-md leading-tight text-left">
                Nâng tầm trải nghiệm công nghệ
              </h1>
              <p className="text-white/80 text-body-md mb-xl max-w-lg hidden md:block text-left">
                Khám phá bộ sưu tập máy tính và linh kiện mới nhất tại
                TechnicalStore. Cam kết chính hãng, hỗ trợ trọn đời.
              </p>
              <button
                onClick={() =>
                  navigate("/all-products", {
                    state: { clearFilter: true },
                  })
                }
                className="flex text-left bg-primary hover:bg-primary-hover text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-bold text-base md:text-lg shadow-lg hover:shadow-primary/30 transition-all border-none cursor-pointer"
              >
                Sắm Ngay
              </button>
            </div>
          </div>
          {/* Arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10">
            <button
              onClick={prevSlide}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-primary transition-all shadow-lg opacity-0 group-hover:opacity-100 border-none cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
            <button
              onClick={nextSlide}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-primary transition-all shadow-lg opacity-0 group-hover:opacity-100 border-none cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          {/* Dots */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {promoSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all border-none cursor-pointer ${
                  index === currentSlide
                    ? "w-8 bg-primary"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </section>

        {/* ===== CATEGORIES GRID ===== */}
        <section className="mb-xl">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="text-headline-lg text-on-surface font-semibold">
              Danh mục sản phẩm
            </h3>
            <button
              onClick={() =>
                navigate("/all-products", {
                  state: { clearFilter: true },
                })
              }
              className="text-primary font-semibold text-sm flex items-center gap-xs bg-transparent border-none cursor-pointer hover:underline"
            >
              Tất cả{" "}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-md">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() =>
                  navigate("/all-products", {
                    state: { filter: cat.filter },
                  })
                }
                className="bg-white p-lg rounded-xl shadow-sm border border-transparent hover:border-primary hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-sm min-h-[130px]"
              >
                <div className="w-12 h-12 shrink-0 bg-surface-container-low rounded-full flex items-center justify-center group-hover:bg-primary-light transition-colors">
                  <span className="material-symbols-outlined text-primary text-2xl leading-none">
                    {cat.icon}
                  </span>
                </div>
                <p className="text-label-md font-semibold text-center w-full leading-tight flex justify-center items-center">
                  {cat.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURED PRODUCTS (BENTO GRID) ===== */}
        <section className="mb-xl">
          <div className="flex items-center gap-md mb-lg">
            <h3 className="text-headline-lg text-on-surface font-semibold">
              Sản phẩm nổi bật
            </h3>
            <div className="h-[2px] flex-1 bg-outline-variant rounded-full"></div>
          </div>
          <div className="bento-grid">
            {/* Featured Product (Large) */}
            {heroProduct && (
              <div className="col-span-12 lg:col-span-6 bg-white rounded-xl shadow-sm border border-slate-border overflow-hidden flex flex-col justify-between">
                <div
                  className="relative cursor-pointer overflow-hidden p-6 flex items-center justify-center min-h-[300px]"
                  onClick={() => handleViewProduct(heroProduct)}
                >
                  <img
                    alt={heroProduct.name}
                    className="w-full max-h-[250px] object-contain hover:scale-105 transition-transform duration-500"
                    src={getProductImage(heroProduct)}
                  />
                  {getProductDiscount(heroProduct) > 0 && (
                    <div className="absolute top-6 left-6 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider">
                      HOT DEAL -{getProductDiscount(heroProduct)}%
                    </div>
                  )}
                </div>
                <div className="p-8 border-t border-slate-border flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className="text-headline-lg font-bold mb-2 cursor-pointer hover:text-primary transition-colors text-on-surface"
                      onClick={() => handleViewProduct(heroProduct)}
                    >
                      {heroProduct.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleViewProduct(heroProduct)}
                      className="mb-4 text-body-sm font-medium text-primary hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      Xem chi tiết &amp; đánh giá →
                    </button>
                    <p className="text-secondary text-body-sm mb-6 line-clamp-2">
                      {heroProduct.description ||
                        "Sản phẩm chất lượng cao, chính hãng 100%. Bảo hành toàn quốc."}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <div className="flex flex-col">
                      {getOldPrice(heroProduct) > 0 && (
                        <span className="text-secondary text-sm line-through mb-0.5">
                          {formatPrice(getOldPrice(heroProduct))}
                        </span>
                      )}
                      <span className="text-primary text-headline-xl font-bold leading-none">
                        {formatPrice(heroProduct.price)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddToCart(heroProduct, 1)}
                      className="bg-primary hover:bg-primary-hover text-white p-4 rounded-xl flex items-center justify-center shadow-lg transition-all border-none cursor-pointer w-12 h-12 shrink-0"
                    >
                      <span className="material-symbols-outlined text-xl">
                        shopping_cart
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Products (4 smaller cards) */}
            {gridProducts.map((product) => (
              <div key={product.id} className="col-span-6 lg:col-span-3">
                <BrowseProductCard
                  product={product}
                  imageUrl={getProductImage(product)}
                  onAddToCart={handleAddToCart}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ===== TOP SELLING PRODUCTS ===== */}
        {topSellingProducts.length > 0 && (
          <section className="mb-xl">
            <div className="flex items-center gap-md mb-lg">
              <h3 className="text-headline-lg text-on-surface font-semibold">
                Bán chạy nhất
              </h3>
              <div className="h-[2px] flex-1 bg-outline-variant rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
              {topSellingProducts.slice(0, 8).map((product) => (
                <BrowseProductCard
                  key={product.id}
                  product={product}
                  imageUrl={getProductImage(product)}
                  onAddToCart={handleAddToCart}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== PROMOTIONS ROW ===== */}
        <section className="mb-xl grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm">
            <div className="p-md bg-white rounded-full shrink-0">
              <span className="material-symbols-outlined text-primary text-3xl">
                local_shipping
              </span>
            </div>
            <div>
              <h6 className="text-label-md font-semibold">
                Giao hàng hỏa tốc
              </h6>
              <p className="text-label-xs text-secondary">
                Miễn phí trong vòng 2h nội thành
              </p>
            </div>
          </div>
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm">
            <div className="p-md bg-white rounded-full shrink-0">
              <span className="material-symbols-outlined text-primary text-3xl">
                payments
              </span>
            </div>
            <div>
              <h6 className="text-label-md font-semibold">
                Trả góp 0% lãi suất
              </h6>
              <p className="text-label-xs text-secondary">
                Thủ tục nhanh gọn trong 15 phút
              </p>
            </div>
          </div>
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm">
            <div className="p-md bg-white rounded-full shrink-0">
              <span className="material-symbols-outlined text-primary text-3xl">
                verified_user
              </span>
            </div>
            <div>
              <h6 className="text-label-md font-semibold">Bảo hành 1 đổi 1</h6>
              <p className="text-label-xs text-secondary">
                Cam kết chính hãng 100%
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
};

