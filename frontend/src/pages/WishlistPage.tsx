import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import {
  WishlistEmptyState,
  WishlistItemRow,
} from '@/components/wishlist/WishlistItemRow';
import { LoadingIndicator } from '@/components/shared';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace('₫', 'đ');

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { wishlistIds, wishlistCount, clearWishlist } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await Promise.all(
          wishlistIds.map((id) => productService.getProductById(id)),
        );
        if (!cancelled) {
          const active = results.filter(
            (p): p is Product => p !== null && p.isActive,
          );
          const orderMap = new Map(wishlistIds.map((id, i) => [id, i]));
          active.sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
          );
          setProducts(active);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadWishlistProducts();
    return () => {
      cancelled = true;
    };
  }, [wishlistIds]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 2800);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price, 0),
    [products],
  );

  const inStockCount = useMemo(
    () => products.filter((p) => p.stock > 0).length,
    [products],
  );

  const handleAddToCart = async (product: Product) => {
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      setStatusMessage(`Đã thêm "${product.name}" vào giỏ hàng.`);
    } catch {
      setStatusMessage('Không thể thêm vào giỏ. Vui lòng thử lại.');
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAllToCart = async () => {
    const inStock = products.filter((p) => p.stock > 0);
    if (!inStock.length) {
      setStatusMessage('Không có sản phẩm còn hàng để thêm.');
      return;
    }
    for (const product of inStock) {
      await addToCart(product.id, 1);
    }
    setStatusMessage(`Đã thêm ${inStock.length} sản phẩm vào giỏ hàng.`);
  };

  return (
    <div className="min-h-screen bg-bg-base pt-[95px]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(183,0,17,0.05),transparent)]" />

      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-10">
        {/* Hero header */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-slate-border/80 bg-bg-card p-6 shadow-card md:p-8">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-primary-hover to-tertiary" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <Heart className="h-7 w-7 fill-primary/20" strokeWidth={1.75} />
              </div>
              <div>
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Bộ sưu tập
                </p>
                <h1 className="text-headline-xl font-bold tracking-tight text-on-surface md:text-[28px]">
                  Danh sách yêu thích
                </h1>
                <p className="mt-1.5 text-body-sm text-secondary">
                  {loading
                    ? 'Đang đồng bộ sản phẩm đã lưu...'
                    : wishlistCount > 0
                      ? `${wishlistCount} sản phẩm · ${inStockCount} còn hàng`
                      : 'Chưa lưu sản phẩm nào'}
                </p>
              </div>
            </div>

            {!loading && products.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddAllToCart()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
                >
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                  Thêm tất cả vào giỏ
                </button>
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-error/30 hover:text-error"
                >
                  Xóa danh sách
                </button>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <output className="mb-6 block rounded-xl border border-tertiary/30 bg-tertiary/5 px-4 py-3 text-body-sm text-tertiary">
            {statusMessage}
          </output>
        )}

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 rounded-2xl border border-slate-border/60 bg-bg-card py-16">
            <LoadingIndicator label="Đang tải yêu thích..." variant="section" />
          </div>
        ) : products.length === 0 ? (
          <WishlistEmptyState onBrowse={() => navigate('/all-products')} />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">
              {products.map((product, index) => (
                <WishlistItemRow
                  key={product.id}
                  product={product}
                  index={index}
                  onAddToCart={handleAddToCart}
                  addingId={addingId}
                />
              ))}
            </div>

            <aside className="sticky top-24 rounded-2xl border border-slate-border bg-bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
                <h2 className="text-base font-semibold text-on-surface">Tóm tắt</h2>
              </div>

              <dl className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-border/60 pb-3">
                  <dt className="text-body-sm text-secondary">Sản phẩm</dt>
                  <dd className="text-body-sm font-semibold tabular-nums text-on-surface">
                    {products.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-slate-border/60 pb-3">
                  <dt className="text-body-sm text-secondary">Còn hàng</dt>
                  <dd className="text-body-sm font-semibold tabular-nums text-tertiary">
                    {inStockCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <dt className="text-body-sm font-medium text-on-surface">Tổng giá trị</dt>
                  <dd className="text-lg font-bold tabular-nums text-primary">
                    {formatVnd(totalValue)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-[11px] leading-relaxed text-secondary">
                Giá tham khảo theo đơn giá từng sản phẩm. Phí vận chuyển tính khi thanh toán.
              </p>

              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-border py-3 text-sm font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                Xem giỏ hàng
              </button>
            </aside>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default WishlistPage;
