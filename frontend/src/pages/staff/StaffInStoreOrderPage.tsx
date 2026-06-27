import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import PageHeader from '@/components/admin/shared/PageHeader';
import { productService } from '@/services/productService';
import { orderService, type CreateInStoreOrderPayload } from '@/services/orderService';
import type { Product, Category } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const FALLBACK_IMG = '/img/logo.png';

const getProductImage = (product: Product): string => {
  const url = product.images?.[0]?.url || product.url;
  return typeof url === 'string' && url.trim() ? url : FALLBACK_IMG;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderLineItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt', icon: 'payments' },
  { value: 'TRANSFER', label: 'Chuyển khoản', icon: 'account_balance' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

// ─── ProductCard ─────────────────────────────────────────────────────────────

const ProductCard = ({
  product,
  addedQty,
  onAdd,
}: {
  product: Product;
  addedQty: number;
  onAdd: (product: Product) => void;
}) => {
  const isOutOfStock = false;
  const isMaxed = false;
  const isLowStock = false;

  return (
    <article className="flex flex-col rounded-xl border border-slate-border/50 bg-bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="relative h-32 overflow-hidden rounded-t-xl bg-bg-soft">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="h-full w-full object-contain p-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />
        {isLowStock && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-label-xs font-medium text-amber-700">
            Còn {product.stock}
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-black/40">
            <span className="rounded-full bg-white/90 px-3 py-1 text-label-xs font-semibold text-error">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-xs p-sm">
        <p className="line-clamp-2 text-label-sm font-medium text-on-surface" title={product.name}>
          {product.name}
        </p>
        {product.category && (
          <span className="w-fit rounded-full bg-primary-light px-2 py-0.5 text-label-xs text-primary">
            {product.category.name}
          </span>
        )}
        <p className="mt-auto text-label-md font-bold text-primary">{formatVND(product.price)}</p>
      </div>

      <div className="border-t border-slate-border/40 p-sm">
        {addedQty > 0 ? (
          <div className="flex items-center justify-between gap-xs">
            <span className="text-label-xs text-secondary">Đã thêm: {addedQty}</span>
            <button
              type="button"
              disabled={isMaxed}
              onClick={() => onAdd(product)}
              className="flex items-center gap-xs rounded-lg bg-primary px-sm py-xs text-label-xs text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MaterialIcon name="add" className="text-[14px]" />
              Thêm
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary px-sm py-sm text-label-sm text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MaterialIcon name="add_shopping_cart" className="text-[16px]" />
            Thêm vào đơn
          </button>
        )}
      </div>
    </article>
  );
};

// ─── OrderItemRow ─────────────────────────────────────────────────────────────

const OrderItemRow = ({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: OrderLineItem;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) => (
  <div className="flex items-start gap-sm py-sm">
    <img
      src={item.image}
      alt={item.productName}
      className="h-11 w-11 shrink-0 rounded-lg bg-bg-soft object-contain p-1"
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK_IMG;
      }}
    />

    <div className="flex min-w-0 flex-1 flex-col gap-xs">
      <p className="line-clamp-1 text-label-sm font-medium text-on-surface">{item.productName}</p>
      <p className="text-label-xs text-secondary">{formatVND(item.price)} / cái</p>
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-border/60 text-secondary transition-colors hover:bg-surface-container-low"
        >
          <MaterialIcon name="remove" className="text-[14px]" />
        </button>
        <span className="w-7 text-center text-label-sm font-semibold text-on-surface">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-border/60 text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MaterialIcon name="add" className="text-[14px]" />
        </button>
      </div>
    </div>

    <div className="flex shrink-0 flex-col items-end gap-xs">
      <button
        type="button"
        onClick={() => onRemove(item.productId)}
        className="p-xs text-secondary transition-colors hover:text-error"
      >
        <MaterialIcon name="close" className="text-[16px]" />
      </button>
      <p className="text-label-sm font-bold text-on-surface">
        {formatVND(item.price * item.quantity)}
      </p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const StaffInStoreOrderPage = () => {
  // ── Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const deferredSearch = useDeferredValue(search);

  // ── Order state
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productService.getAllProducts(),
        productService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    };
    void load();
  }, []);

  // ── Filtered products
  const filteredProducts = useMemo(() => {
    const kw = deferredSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch = !kw || p.name.toLowerCase().includes(kw);
      const matchCat = !selectedCategory || p.category?.id === selectedCategory;
      return matchSearch && matchCat && p.isActive;
    });
  }, [products, deferredSearch, selectedCategory]);

  // ── Added qty map for quick lookup in product cards
  const addedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderItems) map.set(item.productId, item.quantity);
    return map;
  }, [orderItems]);

  // ── Cart operations
  const addProduct = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: Number(product.price),
          quantity: 1,
          image: getProductImage(product),
        },
      ];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setOrderItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: qty }
            : item,
        ),
      );
    }
  };

  const removeItem = (productId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearOrder = () => {
    setOrderItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setPaymentMethod('CASH');
  };

  // ── Totals
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  // ── Submit
  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng.');
      return;
    }
    try {
      setSubmitting(true);
      const payload: CreateInStoreOrderPayload = {
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod,
        totalAmount,
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      };
      await orderService.createInStoreOrder(payload);
      toast.success('Đơn hàng đã được tạo thành công!');
      clearOrder();
    } catch {
      toast.error('Tạo đơn hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Bán hàng tại quầy"
          description="Tạo đơn hàng trực tiếp cho khách mua tại cửa hàng."
        />

        <div className="flex items-start gap-lg">
          {/* ── Left: Product catalog ─────────────────────────────────── */}
          <section className="min-w-0 flex-1 space-y-md">
            {/* Search + Category filter */}
            <div className="space-y-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-sm">
              {/* Search input */}
              <div className="relative">
                <MaterialIcon
                  name="search"
                  className="absolute left-md top-1/2 -translate-y-1/2 text-[20px] text-secondary"
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-border/60 bg-bg-base py-sm pl-10 pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-sm top-1/2 -translate-y-1/2 p-xs text-secondary hover:text-on-surface"
                  >
                    <MaterialIcon name="close" className="text-[16px]" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className={`rounded-full px-md py-xs text-label-sm transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)
                    }
                    className={`rounded-full px-md py-xs text-label-sm transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-secondary hover:bg-surface-container'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Result count */}
            <p className="text-label-sm text-secondary">
              {loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm`}
            </p>

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse rounded-xl border border-slate-border/50 bg-bg-card"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-md rounded-xl border border-slate-border/50 bg-bg-card text-secondary">
                <MaterialIcon name="inventory_2" className="text-[48px]" />
                <p className="text-body-md">Không tìm thấy sản phẩm phù hợp</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addedQty={addedQtyMap.get(product.id) ?? 0}
                    onAdd={addProduct}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Right: Order panel ────────────────────────────────────── */}
          <aside className="sticky top-4 w-80 shrink-0 space-y-md">
            {/* Order items card */}
            <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-border/40 px-md py-sm">
                <div className="flex items-center gap-sm">
                  <MaterialIcon name="shopping_cart" className="text-[20px] text-primary" />
                  <h2 className="text-label-md font-semibold text-on-surface">Đơn hàng</h2>
                  {totalItems > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-xs text-label-xs font-bold text-on-primary">
                      {totalItems}
                    </span>
                  )}
                </div>
                {orderItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearOrder}
                    className="flex items-center gap-xs text-label-xs text-secondary transition-colors hover:text-error"
                  >
                    <MaterialIcon name="delete_sweep" className="text-[16px]" />
                    Xóa hết
                  </button>
                )}
              </div>

              {/* Items list */}
              {orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-sm py-8 text-secondary">
                  <MaterialIcon name="add_shopping_cart" className="text-[40px]" />
                  <p className="text-body-sm">Chưa có sản phẩm trong đơn</p>
                </div>
              ) : (
                <div className="max-h-72 divide-y divide-slate-border/30 overflow-y-auto px-md">
                  {orderItems.map((item) => (
                    <OrderItemRow
                      key={item.productId}
                      item={item}
                      onUpdateQty={updateQty}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Customer + Payment + Total card */}
            <div className="space-y-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-md">
              {/* Customer info */}
              <div className="space-y-sm">
                <h3 className="flex items-center gap-xs text-label-sm font-semibold text-on-surface">
                  <MaterialIcon name="person" className="text-[16px] text-secondary" />
                  Thông tin khách hàng
                </h3>
                <input
                  type="text"
                  placeholder="Tên khách hàng (tuỳ chọn)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-border/60 bg-bg-base px-sm py-xs text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại (tuỳ chọn)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-border/60 bg-bg-base px-sm py-xs text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <hr className="border-slate-border/40" />

              {/* Payment method */}
              <div className="space-y-sm">
                <h3 className="flex items-center gap-xs text-label-sm font-semibold text-on-surface">
                  <MaterialIcon name="payments" className="text-[16px] text-secondary" />
                  Phương thức thanh toán
                </h3>
                <div className="flex flex-col gap-xs">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.value}
                      className={`flex cursor-pointer items-center gap-sm rounded-lg border p-sm transition-all ${
                        paymentMethod === method.value
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-slate-border/50 text-secondary hover:border-primary/40 hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        className="hidden"
                      />
                      <MaterialIcon name={method.icon} className="text-[18px]" />
                      <span className="flex-1 text-label-sm font-medium">{method.label}</span>
                      {paymentMethod === method.value && (
                        <MaterialIcon name="check_circle" className="text-[16px]" filled />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-slate-border/40" />

              {/* Note */}
              <div className="space-y-xs">
                <h3 className="flex items-center gap-xs text-label-sm font-semibold text-on-surface">
                  <MaterialIcon name="note_alt" className="text-[16px] text-secondary" />
                  Ghi chú
                </h3>
                <textarea
                  rows={2}
                  placeholder="Ghi chú đơn hàng (tuỳ chọn)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-border/60 bg-bg-base px-sm py-xs text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <hr className="border-slate-border/40" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-body-md font-semibold text-on-surface">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">{formatVND(totalAmount)}</span>
              </div>

              {/* Breakdown by item count */}
              {totalItems > 0 && (
                <p className="text-right text-label-xs text-secondary">
                  {totalItems} sản phẩm · {orderItems.length} loại
                </p>
              )}

              {/* Create order button */}
              <button
                type="button"
                disabled={orderItems.length === 0 || submitting}
                onClick={handleCreateOrder}
                className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md font-semibold text-on-primary shadow-md transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                    Đang tạo đơn...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="point_of_sale" className="text-[20px]" />
                    Tạo đơn hàng
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffInStoreOrderPage;
