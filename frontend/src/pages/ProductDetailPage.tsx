import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Package,
  Tag,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import ProductSpecDetails from "@/components/product/ProductSpecDetails";
import ProductFeedbackSection from "@/components/product/ProductFeedbackSection";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { LoadingIndicator, ProductDetailSkeleton } from "@/components/shared";
import { useWishlist } from "@/hooks/useWishlist";
import { productService } from "@/services/productService";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/product";

const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
    .format(amount)
    .replace("₫", "đ");

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, getItemQuantity } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [wishlistStatus, setWishlistStatus] = useState<string | null>(null);
  const { isWishlisted, toggleWishlist } = useWishlist(productId);

  const navFrom = (location.state as { from?: string } | null)?.from;
  const fromCart = navFrom === "cart";
  const fromHome = navFrom === "home";
  const fromBrowse = navFrom === "all-products";
  const cartQty = productId ? getItemQuantity(productId) : 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!productId) {
        setError("Không tìm thấy mã sản phẩm.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getProductById(productId);
        if (!cancelled) {
          if (!data) setError("Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
          else setProduct(data);
        }
      } catch {
        if (!cancelled) setError("Không thể tải thông tin sản phẩm.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleToggleWishlist = () => {
    if (!product?.id) return;
    const added = toggleWishlist(product.id);
    setWishlistStatus(added ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
  };

  useEffect(() => {
    if (!wishlistStatus) return;
    const timer = setTimeout(() => setWishlistStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [wishlistStatus]);

  const handleAddToCart = async () => {
    if (!product?.id) return;
    setAdding(true);
    setAddStatus(null);
    try {
      await addToCart(product.id, 1);
      setAddStatus("Đã thêm 1 sản phẩm vào giỏ hàng.");
    } catch {
      setAddStatus("Không thể thêm vào giỏ. Vui lòng thử lại.");
    } finally {
      setAdding(false);
    }
  };

  const backHref = fromCart ? "/cart" : fromHome ? "/" : fromBrowse ? "/all-products" : "/all-products";
  const backLabel = fromCart
    ? "Quay lại giỏ hàng"
    : fromHome
      ? "Quay lại trang chủ"
      : "Quay lại danh sách";

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <ProductDetailSkeleton />
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-bg-base pt-[74px]">
        <div className="mx-auto max-w-page px-4 py-16 text-center">
          <p className="mb-6 text-body-md text-error">{error}</p>
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-on-primary hover:bg-primary-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(183,0,17,0.06),transparent)]" />

      <div className="mx-auto max-w-page px-4 pb-12 pt-[90px] md:px-6">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-body-sm">
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-border bg-bg-card px-3 py-2 text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <span className="text-secondary/50">/</span>
          <span className="text-secondary">{product.category?.name || "Sản phẩm"}</span>
          <span className="text-secondary/50">/</span>
          <span className="font-medium text-on-surface line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 items-start">
          <div className="relative">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          <div className="flex flex-col gap-6 text-left">
            <header className="space-y-3">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                <Tag className="h-3.5 w-3.5" />
                {product.category?.name}
              </p>
              <h1 className="font-outfit text-2xl md:text-[32px] md:leading-[40px] font-bold tracking-tight text-zinc-900 text-left">
                {product.name}
              </h1>
              <p className="font-outfit tabular-nums text-3xl md:text-4xl font-extrabold text-primary text-left">
                {formatVnd(product.price)}
              </p>
            </header>

            <div className="flex flex-wrap gap-3">
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider font-outfit ${
                  inStock
                    ? "bg-tertiary/10 text-tertiary"
                    : "bg-error/10 text-error"
                }`}
              >
                <Package className="h-4 w-4" />
                {inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
              </div>
              {cartQty > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider font-outfit text-zinc-600">
                  Trong giỏ: <strong className="text-primary font-bold">{cartQty}</strong>
                </div>
              )}
            </div>

            {product.description && (
              <div className="border-t border-zinc-100 pt-6 text-left">
                <h2 className="font-outfit font-bold text-base text-zinc-900 mb-3">Mô tả sản phẩm</h2>
                <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap font-sans">
                  {product.description}
                </p>
              </div>
            )}

            <section className="border-t border-zinc-100 pt-6 text-left">
              <h2 className="font-outfit font-bold text-base text-zinc-900 mb-4">Thông số kỹ thuật</h2>
              <ProductSpecDetails product={product} />
            </section>

            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-zinc-100">
              <button
                type="button"
                disabled={!inStock || adding}
                onClick={handleAddToCart}
                className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white py-3.5 px-6 font-outfit font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg shadow-primary/20 hover:shadow-primary/30 border-none cursor-pointer sm:flex-none"
              >
                {adding ? (
                  <LoadingIndicator variant="button" showLabel={false} />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-zinc-600 font-outfit font-semibold text-sm transition-all duration-300 hover:bg-zinc-50 hover:text-zinc-800 hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                Xem giỏ hàng
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isWishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
                aria-pressed={isWishlisted}
                className={`inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border transition-all duration-300 active:scale-[0.98] cursor-pointer ${
                  isWishlisted
                    ? "border-primary bg-primary/5 text-primary shadow-[0_0_0_3px_rgba(183,0,17,0.12)] font-bold"
                    : "border-zinc-200 bg-white text-zinc-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <Heart
                  className={`h-5 w-5 transition-transform duration-200 ${isWishlisted ? "scale-110 fill-primary text-primary" : ""}`}
                  strokeWidth={1.75}
                />
              </button>
            </div>
            {(addStatus || wishlistStatus) && (
              <p className="text-body-sm text-tertiary" role="status">
                {addStatus || wishlistStatus}
              </p>
            )}
          </div>
        </div>

        <div className="mt-12">
          <ProductFeedbackSection productId={product.id} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
