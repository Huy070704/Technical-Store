import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import type { CartLineItem } from '@/types/cart';
import { LazyImage } from '@/components/shared/LazyImage';
import { cart } from '@/styles/cartClasses';
import { formatVnd, getProductCategoryLabel } from '@/utils/cartFormat';

interface CartItemRowProps {
  item: CartLineItem;
}

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const {
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    operationLoading,
    selectedProductIds,
    toggleItemSelection,
  } = useCart();

  const [qty, setQty] = useState(item.quantity);
  const productId = item.product.id;
  const isSelected = selectedProductIds.has(productId);
  const imageUrl = item.product.images?.[0]?.url ?? '/img/pc.png';
  const atMax = qty >= item.product.stock;
  const lineTotal = item.product.price * qty;

  useEffect(() => {
    setQty(item.quantity);
  }, [item.quantity]);

  const onIncrease = async () => {
    if (atMax || operationLoading) return;
    setQty((q) => q + 1);
    try {
      await increaseQuantity(productId, 1);
    } catch {
      setQty(item.quantity);
    }
  };

  const onDecrease = async () => {
    if (operationLoading) return;
    if (qty <= 1) {
      await removeItem(productId);
      return;
    }
    setQty((q) => q - 1);
    try {
      await decreaseQuantity(productId, 1);
    } catch {
      setQty(item.quantity);
    }
  };

  const onRemove = async () => {
    if (operationLoading) return;
    await removeItem(productId);
  };

  return (
    <article
      className={`${cart.cartProductCard} ${isSelected ? cart.cartProductCardSelected : ''}`}
    >
      <div
        className={`${cart.cartProductCardAccent} ${isSelected ? cart.cartProductCardAccentSelected : ''}`}
        aria-hidden
      />

      <button
        type="button"
        className={cart.cartProductRemove}
        onClick={() => void onRemove()}
        disabled={operationLoading}
        aria-label="Xóa khỏi giỏ"
      >
        <Trash2 size={15} strokeWidth={1.5} />
      </button>

      <div className={cart.cartProductCardInner}>
        <div className={cart.cartProductSelectRail}>
          <label className={cart.cartProductSelect}>
            <input
              type="checkbox"
              className={cart.checkbox}
              checked={isSelected}
              onChange={(e) => toggleItemSelection(productId, e.target.checked)}
              aria-label={`Chọn ${item.product.name}`}
            />
            <span className="text-label-xs text-secondary sm:hidden">Chọn</span>
          </label>
        </div>

        <div className={cart.cartProductCardBody}>
          <Link
            to={`/product/${productId}`}
            className={cart.cartProductImageBtn}
          >
            <LazyImage
              src={imageUrl}
              alt={item.product.name}
              className={cart.cartProductImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/img/pc.png';
              }}
            />
            <span className={cart.cartProductImageOverlay}>
              <Eye size={14} strokeWidth={1.5} />
              Xem
            </span>
          </Link>

          <div className={cart.cartProductInfo}>
            <div className={cart.cartProductInfoTop}>
              <span className={cart.cartProductCategoryBadge}>
                {getProductCategoryLabel(item.product.category)}
              </span>

              <Link
                to={`/product/${productId}`}
                className={cart.cartProductTitleBtn}
              >
                <h3 className={cart.cartProductName}>{item.product.name}</h3>
              </Link>

              <div className={cart.cartProductMetaRow}>
                <div className={cart.cartProductMetaItem}>
                  <span className={cart.cartProductMetaLabel}>Đơn giá</span>
                  <span className={cart.cartProductMetaValuePrice}>
                    {formatVnd(item.product.price)}
                  </span>
                </div>
                <div className={cart.cartProductMetaItem}>
                  <span className={cart.cartProductMetaLabel}>Tồn kho</span>
                  <span className={cart.cartProductStockBadge}>
                    <Package size={11} strokeWidth={1.5} />
                    {item.product.stock} sp
                  </span>
                </div>
              </div>
            </div>

            <div className={cart.cartProductActionBar}>
              <div className={cart.cartProductQtyGroup}>
                <span className={cart.cartProductQtyLabel}>Số lượng</span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className={cart.cartProductQtyControl}>
                    <button
                      type="button"
                      className={cart.cartProductQtyBtn}
                      onClick={() => void onDecrease()}
                      disabled={operationLoading}
                      aria-label="Giảm"
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <div className={cart.cartProductQtyDisplay}>{qty}</div>
                    <button
                      type="button"
                      className={cart.cartProductQtyBtn}
                      onClick={() => void onIncrease()}
                      disabled={operationLoading || atMax}
                      aria-label="Tăng"
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {atMax && (
                    <p className={cart.cartProductQtyWarn}>Tối đa tồn kho</p>
                  )}
                </div>
              </div>

              <div className={cart.cartProductLineTotal}>
                <span className={cart.cartProductLineTotalLabel}>Thành tiền</span>
                <span className={cart.cartProductLineTotalValue}>
                  {formatVnd(lineTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
