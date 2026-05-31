import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '@/types/product';

interface BrowseProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  compact?: boolean;
  imageUrl?: string;
  fromSource?: 'home' | 'all-products';
}

const formatVnd = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace('₫', 'đ');

export const BrowseProductCard = ({
  product,
  onAddToCart,
  compact = false,
  imageUrl: imageUrlProp,
  fromSource = 'home',
}: BrowseProductCardProps) => {
  const navigate = useNavigate();
  const stock =
    product.stock != null && product.stock !== undefined
      ? Number(product.stock)
      : null;
  const inStock = stock === null ? true : stock > 0;
  const maxQty = stock ?? 99;
  const [quantity, setQuantity] = useState(1);
  const atMax = stock !== null && quantity >= stock;

  const imageUrl =
    imageUrlProp || product.images?.[0]?.url || product.url || '/img/pc.png';

  const goToDetail = () => {
    navigate(`/product/${product.id}`, { state: { from: fromSource } });
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inStock) return;
    onAddToCart(product, quantity);
  };

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-border/80 bg-bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(11,28,48,0.08)] ${
        compact ? 'p-3' : 'p-3.5'
      }`}
    >
      <button
        type="button"
        onClick={goToDetail}
        className={`relative mb-2.5 w-full overflow-hidden rounded-lg bg-surface-container-low ${
          compact ? 'aspect-[4/3]' : 'aspect-square'
        }`}
        aria-label={`Xem ${product.name}`}
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/img/pc.png';
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-on-surface/0 text-on-primary text-label-xs font-medium opacity-0 transition-all group-hover:bg-on-surface/45 group-hover:opacity-100">
          <Eye className="h-3.5 w-3.5" />
          Chi tiết
        </span>
        {!inStock && (
          <span className="absolute left-2 top-2 rounded bg-on-surface/80 px-1.5 py-0.5 text-[10px] font-semibold text-inverse-on-surface">
            Hết hàng
          </span>
        )}
      </button>

      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
        <span className="truncate">{product.category?.name || 'Sản phẩm'}</span>
        {stock !== null && inStock && (
          <>
            <span className="text-slate-border">·</span>
            <span className="shrink-0 text-tertiary">Còn {stock}</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={goToDetail}
        className="mb-2 line-clamp-2 text-left text-[13px] font-semibold leading-snug text-on-surface transition-colors hover:text-primary min-h-[2.5rem]"
      >
        {product.name}
      </button>

      <p className="mb-2.5 text-base font-bold leading-none text-primary tabular-nums">
        {formatVnd(product.price)}
      </p>

      <div className="mt-auto flex items-center gap-2">
        <div
          className="flex items-center rounded-lg border border-slate-border/90 bg-surface-container-low/60"
          aria-label="Số lượng"
        >
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-30"
            disabled={!inStock || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Giảm"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-on-surface">
            {quantity}
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-30"
            disabled={!inStock || atMax}
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            aria-label="Tăng"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-secondary/40"
          title="Thêm vào giỏ"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Thêm
        </button>
      </div>
    </article>
  );
};
