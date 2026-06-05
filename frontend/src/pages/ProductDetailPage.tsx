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

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          <div className="flex flex-col gap-6">
            <header>
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-label-xs font-semibold uppercase tracking-wide text-primary">
                <Tag className="h-3.5 w-3.5" />
                {product.category?.name}
              </p>
              <h1 className="text-headline-xl font-bold tracking-tight text-on-surface md:text-[32px] md:leading-[40px]">
                {product.name}
              </h1>
              <p className="mt-4 text-3xl font-bold text-primary md:text-4xl">
                {formatVnd(product.price)}
              </p>
            </header>

            <div className="flex flex-wrap gap-3">
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-body-sm font-medium ${
                  inStock
                    ? "bg-tertiary/10 text-tertiary"
                    : "bg-error/10 text-error"
                }`}
              >
                <Package className="h-4 w-4" />
                {inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
              </div>
              {cartQty > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-secondary-container/50 px-4 py-2.5 text-body-sm font-medium text-secondary">
                  Trong giỏ: <strong className="text-primary">{cartQty}</strong>
                </div>
              )}
            </div>

            {product.description && (
              <div className="rounded-xl border border-slate-border bg-surface-container-low/40 p-5">
                <h2 className="mb-2 text-headline-lg text-on-surface">Mô tả</h2>
                <p className="text-body-sm leading-relaxed text-on-surface/85 whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            <section className="rounded-2xl border border-slate-border bg-bg-card p-6">
              <h2 className="mb-4 text-headline-lg text-on-surface">Thông số kỹ thuật</h2>
              <ProductSpecDetails product={product} />
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!inStock || adding}
                onClick={handleAddToCart}
                className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-on-primary transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-border bg-bg-card px-6 py-3.5 text-base font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                Xem giỏ hàng
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isWishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
                aria-pressed={isWishlisted}
                className={`inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                  isWishlisted
                    ? "border-primary bg-primary-light text-primary shadow-[0_0_0_3px_rgba(183,0,17,0.12)]"
                    : "border-slate-border bg-bg-card text-secondary hover:border-primary/40 hover:bg-primary-light/40 hover:text-primary"
                }`}
              >
                <Heart
                  className={`h-5 w-5 transition-transform duration-200 ${isWishlisted ? "scale-110 fill-primary" : ""}`}
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
