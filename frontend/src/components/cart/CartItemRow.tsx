import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/useCart';
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
      <div className={cart.cartProductCardTop}>
        <label className={cart.cartProductSelect}>
          <input
            type="checkbox"
            className={cart.checkbox}
            checked={isSelected}
            onChange={() => toggleItemSelection(productId)}
            aria-label={`Chọn ${item.product.name}`}
          />
          <span className="text-body-sm text-on-surface">Chọn thanh toán</span>
        </label>
        <button
          type="button"
          className={cart.cartProductRemove}
          onClick={() => void onRemove()}
          disabled={operationLoading}
          aria-label="Xóa khỏi giỏ"
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
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
        </Link>

        <div className={cart.cartProductInfo}>
          <Link to={`/product/${productId}`} className={cart.cartProductTitleBtn}>
            <h3 className={cart.cartProductName}>{item.product.name}</h3>
          </Link>
          <span className={cart.cartProductCategory}>
            {getProductCategoryLabel(item.product.category)}
          </span>
          <div className={cart.cartProductMetaGrid}>
            <div className={cart.cartProductMetaCell}>
              <span className={cart.cartProductMetaLabel}>Đơn giá</span>
              <span className={cart.cartProductMetaValue}>
                {formatVnd(item.product.price)}
              </span>
            </div>
            <div className={cart.cartProductMetaCell}>
              <span className={cart.cartProductMetaLabel}>Tồn kho</span>
              <span className={cart.cartProductMetaValue}>{item.product.stock}</span>
            </div>
          </div>
        </div>

        <div className={cart.cartProductQtyPanel}>
          <span className={cart.cartProductQtyTitle}>Số lượng</span>
          <div className={cart.cartProductQtyControl}>
            <button
              type="button"
              className={cart.cartProductQtyBtn}
              onClick={() => void onDecrease()}
              disabled={operationLoading}
              aria-label="Giảm"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <div className={cart.cartProductQtyDisplay}>
              <span className={cart.cartProductQtyNumber}>{qty}</span>
            </div>
            <button
              type="button"
              className={cart.cartProductQtyBtn}
              onClick={() => void onIncrease()}
              disabled={operationLoading || atMax}
              aria-label="Tăng"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
          {atMax && (
            <p className={cart.cartProductQtyWarn}>Đã đạt tồn kho tối đa</p>
          )}
          <div className={cart.cartProductLineTotal}>
            <span className={cart.cartProductLineTotalLabel}>Thành tiền</span>
            <span className={cart.cartProductLineTotalValue}>
              {formatVnd(item.product.price * qty)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
