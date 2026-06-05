import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { LoadingIndicator } from '@/components/shared';
import { useWishlist } from '@/hooks/useWishlist';
import type { Product } from '@/types/product';

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace('₫', 'đ');

interface WishlistItemRowProps {
  product: Product;
  index: number;
  onAddToCart: (product: Product) => void;
  addingId: string | null;
}

export const WishlistItemRow = ({
  product,
  index,
  onAddToCart,
  addingId,
}: WishlistItemRowProps) => {
  const navigate = useNavigate();
  const { toggleWishlist } = useWishlist(product.id);

  const imageUrl = product.images?.[0]?.url || '/img/pc.png';
  const inStock = product.stock > 0;
  const isAdding = addingId === product.id;

  const goToDetail = () => {
    navigate(`/product/${product.id}`, { state: { from: 'all-products' } });
  };

  return (
    <article
      className="skeleton-rise group relative overflow-hidden rounded-2xl border border-slate-border/80 bg-bg-card transition-all duration-300 hover:border-primary/20 hover:shadow-[0_12px_36px_rgba(11,28,48,0.07)]"
      style={{ animationDelay: `${index * 65}ms` }}
    >
      <div className="absolute left-0 top-0 z-10 h-full w-[3px] bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-col gap-0 sm:flex-row">
        <button
          type="button"
          onClick={goToDetail}
          className="relative shrink-0 overflow-hidden border-b border-slate-border/50 bg-surface-container-low/40 sm:w-[148px] sm:border-b-0 sm:border-r"
          aria-label={`Xem ${product.name}`}
        >
          <div className="flex aspect-[4/3] items-center justify-center p-4 sm:aspect-auto sm:h-full sm:min-h-[148px]">
            <img
              src={imageUrl}
              alt={product.name}
              className="max-h-[120px] w-full object-contain transition-transform duration-500 group-hover:scale-[1.04] sm:max-h-[128px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/img/pc.png';
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(203,213,225,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,0.28)_1px,transparent_1px)] bg-[size:14px_14px] opacity-60" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary">
                  {product.category?.name || 'Sản phẩm'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    inStock ? 'text-tertiary' : 'text-error'
                  }`}
                >
                  <Package size={12} strokeWidth={1.5} />
                  {inStock ? `Còn ${product.stock}` : 'Hết hàng'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Xóa khỏi yêu thích"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-secondary transition-all hover:border-error/20 hover:bg-error/5 hover:text-error"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Xóa</span>
              </button>
            </div>

            <button
              type="button"
              onClick={goToDetail}
              className="line-clamp-2 text-left text-base font-semibold leading-snug text-on-surface transition-colors hover:text-primary sm:text-[17px]"
            >
              {product.name}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-border/60 bg-surface-container-low/25 px-4 py-3.5 sm:px-5">
            <p className="text-lg font-bold tabular-nums text-primary sm:text-xl">
              {formatVnd(product.price)}
            </p>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <button
                type="button"
                disabled={!inStock || isAdding}
                onClick={() => onAddToCart(product)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[148px]"
              >
                {isAdding ? (
                  <LoadingIndicator variant="button" showLabel={false} />
                ) : (
                  <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
                )}
                {isAdding ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>

              <button
                type="button"
                onClick={goToDetail}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary sm:flex-none"
              >
                Chi tiết
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

interface WishlistEmptyStateProps {
  onBrowse: () => void;
}

export const WishlistEmptyState = ({ onBrowse }: WishlistEmptyStateProps) => (
  <div className="relative overflow-hidden rounded-3xl border border-slate-border/70 bg-bg-card shadow-[0_20px_60px_rgba(11,28,48,0.06)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(183,0,17,0.09),transparent_55%),radial-gradient(ellipse_60%_50%_at_90%_80%,rgba(0,104,43,0.06),transparent_50%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(203,213,225,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,0.25)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

    <div className="relative grid gap-10 px-6 py-14 md:grid-cols-[1fr_1.1fr] md:items-center md:px-12 md:py-16">
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <div className="relative mb-8">
          <span className="absolute -inset-6 rounded-full bg-primary/10 loader-ring-breathe" aria-hidden />
          <span className="absolute -inset-3 rounded-full border border-primary/20" aria-hidden />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-bg-card shadow-[0_8px_32px_rgba(183,0,17,0.15)]">
            <Heart className="h-11 w-11 fill-primary text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="mb-3 text-[28px] font-bold leading-tight tracking-tight text-on-surface md:text-[32px]">
          Bộ sưu tập trống
        </h2>
        <p className="mb-8 max-w-sm text-body-md leading-relaxed text-secondary">
          Lưu những sản phẩm bạn đang cân nhắc — bấm trái tim trên trang chi tiết để thêm vào đây.
        </p>

        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-on-primary shadow-primary-glow transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
        >
          Khám phá sản phẩm
          <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 md:gap-4">
        {[
          { step: '01', title: 'Dạo sản phẩm', desc: 'Tìm laptop, PC, linh kiện phù hợp' },
          { step: '02', title: 'Nhấn trái tim', desc: 'Lưu nhanh trên trang chi tiết' },
          { step: '03', title: 'Quay lại đây', desc: 'So sánh và thêm vào giỏ bất cứ lúc nào' },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-xl border border-slate-border/60 bg-bg-card/80 p-4 backdrop-blur-sm transition-colors hover:border-primary/20"
          >
            <span className="font-mono text-[11px] font-bold tracking-widest text-primary/70">
              {item.step}
            </span>
            <p className="mt-1 text-sm font-semibold text-on-surface">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
