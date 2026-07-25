import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { BrowseProductCard } from '@/components/product/BrowseProductCard';
import { LoadingIndicator, ProductGridSkeleton } from '@/components/shared';
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
  { id: "keyboard", name: "Bàn phím", icon: "keyboard", filter: "keyboard" },
  { id: "network", name: "Mạng", icon: "router", filter: "network" },
];

// Tab definitions for Khối 3
const categoryTabs = [
  { id: "laptop", label: "Laptop", icon: "laptop" },
  { id: "accessories", label: "Phụ kiện", icon: "mouse" },
  { id: "monitor", label: "Màn hình", icon: "monitor" },
  { id: "components", label: "Linh kiện", icon: "memory" },
] as const;

type TabId = (typeof categoryTabs)[number]["id"];

export const HomePage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, token } = useAuth();

  // Data states
  const [newProducts, setNewProducts] = useState<{
    laptops: Product[];
    pcs: Product[];
    accessories: Product[];
  }>({ laptops: [], pcs: [], accessories: [] });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<Product[]>([]);
  const [pcProducts, setPcProducts] = useState<Product[]>([]);
  const [monitorProducts, setMonitorProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [addToCartStatus, setAddToCartStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("laptop");

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


  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [newProductsData, featuredData, topSellingData, pcData] =
          await Promise.all([
            productService.getNewProducts(8),
            productService.getFeaturedProducts(8),
            productService.getTopSellingProducts(8),
            productService.getProductsByType("pc", 4),
          ]);
        setNewProducts(newProductsData);
        setFeaturedProducts(
          Array.isArray(featuredData) ? featuredData : []
        );
        setTopSellingProducts(
          Array.isArray(topSellingData) ? topSellingData : []
        );
        setPcProducts(Array.isArray(pcData) ? pcData : []);

        // Fetch monitor products separately (không block loading)
        productService
          .getProductsByCategoryName("Monitor")
          .then((data) => setMonitorProducts(data.slice(0, 4)))
          .catch(() => setMonitorProducts([]));
      } catch (error) {
        setNewProducts({ laptops: [], pcs: [], accessories: [] });
        setFeaturedProducts([]);
        setTopSellingProducts([]);
        setPcProducts([]);
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

  // Get products for active tab in Khối 3
  const getTabProducts = (): Product[] => {
    switch (activeTab) {
      case "laptop":
        return (newProducts.laptops || []).slice(0, 4);
      case "accessories":
        return (newProducts.accessories || []).slice(0, 4);
      case "monitor":
        return monitorProducts;
      case "components": {
        // Lấy từ accessories những sản phẩm có category chứa keyword linh kiện
        const componentKeywords = ["cpu", "gpu", "ram", "ssd", "hdd", "psu", "case", "mainboard", "motherboard"];
        const components = (newProducts.accessories || []).filter((p) => {
          const catName = p.category?.name?.toLowerCase() || "";
          const prodName = p.name.toLowerCase();
          return componentKeywords.some(
            (kw) => catName.includes(kw) || prodName.includes(kw)
          );
        });
        // Nếu không tìm được, fallback về accessories
        return components.length > 0
          ? components.slice(0, 4)
          : (newProducts.accessories || []).slice(0, 4);
      }
      default:
        return [];
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-bg-base pt-[95px]">
        <div className="loading-grid-bg flex min-h-[50vh] flex-col items-center justify-center gap-8 px-4">
          <LoadingIndicator label="Đang tải sản phẩm..." variant="page" />
        </div>
        <div className="mx-auto max-w-page px-4 pb-16 md:px-8">
          <ProductGridSkeleton count={8} className="opacity-60" />
        </div>
        <Footer />
      </main>
    );
  }

  const tabProducts = getTabProducts();

  return (
    <main className="pt-[95px] min-h-screen bg-bg-base">
      {/* Toast Notifications */}
      {addToCartStatus && (
        <div
          className={`fixed top-[95px] right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm transition-all ${addToCartStatus.type === "success"
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
      <div className="w-full px-3 md:px-4 py-4 md:pt-lg md:pb-[10px]">
        {/* ===== HERO BANNER SLIDER ===== */}
        <section className="mb-xl relative rounded-2xl overflow-hidden h-[300px] md:h-[450px] lg:h-[500px] shadow-xl group">
          {/* Slides */}
          {promoSlides.map((slide, index) => (
            <img
              key={slide.id}
              alt={`Promo banner ${slide.id}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              src={slide.image}
            />
          ))}
          {/* Gradient overlay and content card */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent flex items-center p-6 md:p-12 lg:p-16">
            <div className="max-w-xl text-left bg-slate-950/45 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 space-y-md animate-fadeInUp shadow-2xl">
              <span className="bg-primary text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full w-fit inline-block">
                CÔNG NGHỆ MỚI 2026
              </span>
              <h1 className="text-white font-bold text-2xl md:text-4xl lg:text-5xl leading-tight">
                Nâng Tầm Trải Nghiệm Công Nghệ
              </h1>
              <p className="text-slate-200 text-body-sm md:text-body-md leading-relaxed hidden sm:block">
                Khám phá bộ sưu tập máy tính và linh kiện chính hãng mới nhất tại TechStore. Hỗ trợ lắp đặt miễn phí, bảo hành chính hãng lên tới 36 tháng.
              </p>
              <button
                onClick={() =>
                  navigate("/all-products", {
                    state: { clearFilter: true },
                  })
                }
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 md:px-8 md:py-3.5 rounded-full font-bold text-sm md:text-body-md shadow-lg transition-all border-none cursor-pointer transform hover:scale-[1.02]"
              >
                SẮM NGAY
                <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
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
                className={`h-2 rounded-full transition-all border-none cursor-pointer ${index === currentSlide
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
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-headline-lg text-on-surface font-bold">
                Danh mục sản phẩm
              </h3>
            </div>
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
                className="bg-white p-lg rounded-xl shadow-sm border border-transparent hover:border-primary/45 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center gap-sm min-h-[130px]"
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

        {/* ===== KHỐI 1: SẢN PHẨM NỔI BẬT (Aggregate từ đơn hàng thực tế) ===== */}
        {featuredProducts.length > 0 && (
          <section className="mb-xl">
            <div className="flex items-center gap-2.5 mb-lg">
              <span className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-headline-lg text-on-surface font-bold">
                Sản phẩm nổi bật
              </h3>
              <div className="h-[2px] flex-1 bg-slate-200 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
              {featuredProducts.map((product) => (
                <BrowseProductCard
                  key={product.id}
                  product={product}
                  imageUrl={getProductImage(product)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== KHỐI 2: PC GAMING & WORKSTATION ===== */}
        {pcProducts.length > 0 && (
          <section className="mb-xl">
            <div className="flex items-center justify-between mb-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="text-headline-lg text-on-surface font-bold">
                  PC Gaming & Workstation
                </h3>
                <div className="h-[2px] flex-1 bg-slate-200 rounded-full"></div>
              </div>
              <button
                onClick={() =>
                  navigate("/all-products", { state: { filter: "pc" } })
                }
                className="text-primary font-semibold text-sm flex items-center gap-xs bg-transparent border-none cursor-pointer hover:underline"
              >
                Xem tất cả{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
              {pcProducts.map((product) => (
                <BrowseProductCard
                  key={product.id}
                  product={product}
                  imageUrl={getProductImage(product)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== KHỐI 3: TABS THEO DANH MỤC ===== */}
        <section className="mb-xl">
          <div className="flex items-center gap-2.5 mb-lg">
            <span className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-headline-lg text-on-surface font-bold">
              Khám phá theo danh mục
            </h3>
            <div className="h-[2px] flex-1 bg-slate-200 rounded-full"></div>
          </div>
          {/* Tab buttons */}
          <div className="flex gap-2 mb-lg overflow-x-auto pb-1">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all border-none cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-on-surface hover:bg-surface-container border border-outline-variant shadow-sm"
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
          {/* Tab content */}
          {tabProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
              {tabProducts.map((product) => (
                <BrowseProductCard
                  key={product.id}
                  product={product}
                  imageUrl={getProductImage(product)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-40">
                inventory_2
              </span>
              <p className="text-sm">Chưa có sản phẩm trong danh mục này</p>
            </div>
          )}
        </section>

        {/* ===== KHỐI 4: BÁN CHẠY NHẤT (Aggregate từ đơn hàng thực tế) ===== */}
        {topSellingProducts.length > 0 && (
          <section className="mb-xl">
            <div className="flex items-center gap-2.5 mb-lg">
              <span className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-headline-lg text-on-surface font-bold">
                Bán chạy nhất
              </h3>
              <div className="h-[2px] flex-1 bg-slate-200 rounded-full"></div>
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
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
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
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
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
          <div className="bg-surface-container rounded-xl p-lg flex items-center gap-lg border border-outline-variant shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
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
