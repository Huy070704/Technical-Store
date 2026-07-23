import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { StaffLayout, StaffPagination } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import PageHeader from '@/components/admin/shared/PageHeader';
import { productService } from '@/services/productService';
import { orderService, type CreateInStoreOrderPayload } from '@/services/orderService';
import type { Product, Category } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';
import { isValidVnPhone } from '@/utils/phoneValidation';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const FALLBACK_IMG = '/img/logo.png';

const getProductImage = (product: Product): string => {
  const url = product.image || product.images?.[0]?.url || product.url;
  return typeof url === 'string' && url.trim() ? url : FALLBACK_IMG;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderLineItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  maxStock: number;
  image: string;
}

interface PendingOrderInfo {
  id: string;
  totalAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  paymentMethod: PaymentMethod;
  items: OrderLineItem[];
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt', icon: 'payments' },
  { value: 'TRANSFER', label: 'Chuyển khoản', icon: 'account_balance' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

// ─── PayosPaymentModal ────────────────────────────────────────────────────────

const PayosPaymentModal = ({
  checkoutUrl,
  totalAmount,
  transferPaid,
  onClose,
}: {
  checkoutUrl: string;
  totalAmount: number;
  transferPaid: boolean;
  onClose: () => void;
}) => {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-md backdrop-blur-sm">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 32px)' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-lg py-sm">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="account_balance" className="text-[20px] text-primary" />
            <div>
              <p className="text-label-md font-semibold text-on-surface">Chuyển khoản ngân hàng</p>
              <p className="text-label-xs text-secondary">Số tiền: {formatVND(totalAmount)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full p-xs text-secondary hover:bg-surface-container-low hover:text-on-surface">
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        {/* iframe content */}
        <div className="relative flex-1 overflow-hidden bg-white" style={{ minHeight: '600px' }}>
          {transferPaid ? (
            <div className="flex h-full flex-col items-center justify-center gap-md p-lg">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <MaterialIcon name="check_circle" className="text-[48px] text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-700">Thanh toán thành công!</p>
              <p className="text-center text-body-sm text-secondary">
                Khách đã chuyển khoản {formatVND(totalAmount)}. Đơn hàng đã được hoàn tất.
              </p>
              <button type="button" onClick={onClose}
                className="rounded-lg bg-green-600 px-lg py-sm text-label-sm font-semibold text-white hover:bg-green-700">
                Đóng
              </button>
            </div>
          ) : (
            <>
              {!iframeLoaded && !iframeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-md bg-white">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-body-sm text-secondary">Đang tải trang thanh toán...</p>
                </div>
              )}

              {iframeError ? (
                /* Fallback khi iframe bị chặn */
                <div className="flex h-full flex-col items-center justify-center gap-lg p-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(checkoutUrl)}&size=240x240&margin=8`}
                    alt="QR thanh toán"
                    className="h-60 w-60 rounded-xl border border-slate-200 shadow-sm"
                  />
                  <div className="space-y-xs text-center">
                    <p className="text-label-md font-bold text-on-surface">{formatVND(totalAmount)}</p>
                    <p className="text-body-sm text-secondary">
                      Quét mã QR bằng app ngân hàng để thanh toán
                    </p>
                  </div>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-sm rounded-lg border border-primary px-lg py-sm text-label-sm font-medium text-primary hover:bg-primary-light">
                    <MaterialIcon name="open_in_new" className="text-[16px]" />
                    Mở trang thanh toán
                  </a>
                </div>
              ) : (
                <iframe
                  src={checkoutUrl}
                  title="Trang thanh toán PayOS"
                  className="h-full w-full border-0"
                  style={{ minHeight: '600px' }}
                  onLoad={() => setIframeLoaded(true)}
                  onError={() => setIframeError(true)}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!transferPaid && (
          <div className="flex items-center justify-between border-t border-slate-200 px-lg py-sm">
            <div className="flex items-center gap-xs text-label-xs text-secondary">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Đang chờ xác nhận thanh toán...
            </div>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-xs text-label-xs text-primary hover:underline">
              <MaterialIcon name="open_in_new" className="text-[14px]" />
              Mở tab mới
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const stock = product.stock ?? 0;
  const isOutOfStock = stock === 0;
  const isMaxed = addedQty >= stock;
  const isLowStock = stock > 0 && stock <= 5;

  return (
    <article className="flex flex-col rounded-xl border border-slate-border/50 bg-bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="relative h-32 overflow-hidden rounded-t-xl bg-bg-soft">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="h-full w-full object-contain p-2"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
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
        {isOutOfStock ? (
          <div className="flex w-full items-center justify-center rounded-lg bg-slate-100 px-sm py-sm text-label-sm text-secondary">
            Hết hàng
          </div>
        ) : addedQty > 0 ? (
          <div className="flex items-center justify-between gap-xs">
            <span className="text-label-xs text-secondary">Đã thêm: {addedQty}/{stock}</span>
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
  readonly = false,
}: {
  item: OrderLineItem;
  onUpdateQty?: (productId: string, qty: number) => void;
  onRemove?: (productId: string) => void;
  readonly?: boolean;
}) => (
  <div className="flex items-start gap-sm py-sm">
    <img
      src={item.image}
      alt={item.productName}
      className="h-10 w-10 shrink-0 rounded-lg bg-bg-soft object-contain p-1"
      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-xs">
      <p className="line-clamp-1 text-label-sm font-medium text-on-surface">{item.productName}</p>
      <p className="text-label-xs text-secondary">{formatVND(item.price)} / cái</p>
      {!readonly && onUpdateQty && onRemove ? (
        <div className="flex items-center gap-xs">
          <button type="button" onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-border/60 text-secondary hover:bg-surface-container-low">
            <MaterialIcon name="remove" className="text-[14px]" />
          </button>
          <span className="w-7 text-center text-label-sm font-semibold text-on-surface">{item.quantity}</span>
          <button type="button" disabled={item.quantity >= item.maxStock}
            onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-border/60 text-secondary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40">
            <MaterialIcon name="add" className="text-[14px]" />
          </button>
        </div>
      ) : (
        <p className="text-label-xs text-secondary">x{item.quantity}</p>
      )}
    </div>
    <div className="flex shrink-0 flex-col items-end gap-xs">
      {!readonly && onRemove && (
        <button type="button" onClick={() => onRemove(item.productId)}
          className="p-xs text-secondary hover:text-error">
          <MaterialIcon name="close" className="text-[16px]" />
        </button>
      )}
      <p className="text-label-sm font-bold text-on-surface">{formatVND(item.price * item.quantity)}</p>
    </div>
  </div>
);

// ─── PaymentPanel ─────────────────────────────────────────────────────────────

const PaymentPanel = ({
  order,
  checkoutUrl,
  loadingQr,
  transferPaid,
  confirmingCash,
  showCancelForm,
  cancelReason,
  cancellingOrder,
  onConfirmCash,
  onNewOrder,
  onShowPayosModal,
  onShowCancelForm,
  onHideCancelForm,
  onCancelReasonChange,
  onCancelOrder,
}: {
  order: PendingOrderInfo;
  checkoutUrl: string;
  loadingQr: boolean;
  transferPaid: boolean;
  confirmingCash: boolean;
  showCancelForm: boolean;
  cancelReason: string;
  cancellingOrder: boolean;
  onConfirmCash: () => void;
  onNewOrder: () => void;
  onShowPayosModal: () => void;
  onShowCancelForm: () => void;
  onHideCancelForm: () => void;
  onCancelReasonChange: (v: string) => void;
  onCancelOrder: () => void;
}) => (
  <div className="space-y-md rounded-xl border border-slate-border/50 bg-bg-card shadow-md overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-sm border-b border-slate-border/40 bg-tertiary/5 px-md py-sm">
      <MaterialIcon name="receipt_long" className="text-[20px] text-tertiary" />
      <div className="min-w-0 flex-1">
        <p className="text-label-sm font-semibold text-on-surface">Đơn hàng đã tạo</p>
        <p className="truncate text-label-xs text-secondary">#{order.id}</p>
      </div>
      <span className="rounded-full bg-tertiary/10 px-sm py-xs text-label-xs font-medium text-tertiary">
        Chờ thanh toán
      </span>
    </div>

    <div className="space-y-md px-md pb-md">
      {/* Items summary */}
      <div className="max-h-40 divide-y divide-slate-border/30 overflow-y-auto">
        {order.items.map((item) => (
          <OrderItemRow key={item.productId} item={item} readonly />
        ))}
      </div>

      {/* Price breakdown */}
      <div className="space-y-xs rounded-lg bg-surface-container-low p-sm">
        <div className="flex justify-between text-body-sm text-secondary">
          <span>Tiền hàng</span>
          <span>{formatVND(order.subtotalAmount)}</span>
        </div>
        <div className="flex justify-between text-body-sm text-secondary">
          <span>Thuế VAT (10%)</span>
          <span>{formatVND(order.vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-border/40 pt-xs">
          <span className="text-label-md font-semibold text-on-surface">Tổng cộng</span>
          <span className="text-label-lg font-bold text-primary">{formatVND(order.totalAmount)}</span>
        </div>
      </div>

      {/* CASH payment */}
      {order.paymentMethod === 'CASH' && (
        <div className="space-y-sm">
          <div className="flex flex-col items-center gap-xs rounded-xl border-2 border-dashed border-primary/40 bg-primary-light py-md">
            <MaterialIcon name="payments" className="text-[32px] text-primary" />
            <p className="text-label-sm text-secondary">Tiền cần thu</p>
            <p className="text-2xl font-bold text-primary">{formatVND(order.totalAmount)}</p>
          </div>
          <button
            type="button"
            disabled={confirmingCash}
            onClick={onConfirmCash}
            className="flex w-full items-center justify-center gap-sm rounded-lg bg-tertiary px-lg py-md text-label-md font-semibold text-on-primary shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmingCash ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                Đang xác nhận...
              </>
            ) : (
              <>
                <MaterialIcon name="check_circle" className="text-[20px]" />
                Xác nhận đã nhận tiền mặt
              </>
            )}
          </button>
        </div>
      )}

      {/* TRANSFER payment */}
      {order.paymentMethod === 'TRANSFER' && (
        <div className="space-y-sm">
          {transferPaid ? (
            <div className="flex flex-col items-center gap-sm rounded-xl bg-green-50 py-lg">
              <MaterialIcon name="check_circle" className="text-[48px] text-green-600" />
              <p className="text-label-md font-semibold text-green-700">Thanh toán thành công!</p>
              <p className="text-label-xs text-secondary">Đơn hàng đã hoàn tất</p>
            </div>
          ) : loadingQr ? (
            <div className="flex flex-col items-center gap-sm py-lg text-secondary">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-label-xs">Đang tạo liên kết thanh toán...</p>
            </div>
          ) : checkoutUrl ? (
            <>
              {/* Main: show payment button + pulse indicator */}
              <button
                type="button"
                onClick={onShowPayosModal}
                className="flex w-full items-center justify-center gap-sm rounded-xl border-2 border-primary bg-primary/5 py-md text-label-md font-semibold text-primary transition-all hover:bg-primary/10 active:scale-95"
              >
                <MaterialIcon name="qr_code_2" className="text-[24px]" />
                Hiển thị mã QR thanh toán
              </button>

              {/* Divider row */}
              <div className="flex items-center gap-sm">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-label-xs text-secondary">hoặc</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-sm rounded-lg border border-slate-border/60 px-lg py-sm text-label-sm font-medium text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                <MaterialIcon name="open_in_new" className="text-[16px]" />
                Mở trang thanh toán (tab mới)
              </a>

              <div className="flex items-center justify-center gap-xs text-label-xs text-secondary">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Đang chờ xác nhận thanh toán tự động...
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-sm rounded-xl border border-dashed border-slate-border/60 py-md text-secondary">
              <MaterialIcon name="qr_code" className="text-[40px]" />
              <p className="text-label-xs text-center">Không tạo được liên kết thanh toán. Vui lòng thử lại.</p>
            </div>
          )}
        </div>
      )}

      {/* New order button */}
      {!transferPaid && (
        <button
          type="button"
          onClick={onNewOrder}
          className="flex w-full items-center justify-center gap-sm rounded-lg border border-slate-border/60 px-lg py-sm text-label-sm font-medium text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          <MaterialIcon name="add_circle" className="text-[18px]" />
          Tạo đơn mới
        </button>
      )}

      {/* Cancel order */}
      {!transferPaid && (
        showCancelForm ? (
          <div className="space-y-sm rounded-xl border border-error/30 bg-error/5 p-sm">
            <p className="text-label-sm font-semibold text-error">Lý do hủy đơn <span className="text-error">*</span></p>
            <textarea
              value={cancelReason}
              onChange={(e) => onCancelReasonChange(e.target.value)}
              placeholder="Nhập lý do hủy đơn hàng..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-border/60 bg-white px-sm py-xs text-body-sm text-on-surface placeholder:text-secondary/60 focus:border-error/60 focus:outline-none focus:ring-1 focus:ring-error/30"
            />
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={onHideCancelForm}
                disabled={cancellingOrder}
                className="flex-1 rounded-lg border border-slate-border/60 py-sm text-label-sm font-medium text-secondary hover:bg-surface-container-low disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={onCancelOrder}
                disabled={cancellingOrder || !cancelReason.trim()}
                className="flex flex-1 items-center justify-center gap-xs rounded-lg bg-error py-sm text-label-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingOrder ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <MaterialIcon name="cancel" className="text-[16px]" />
                )}
                {cancellingOrder ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onShowCancelForm}
            className="flex w-full items-center justify-center gap-sm rounded-lg border border-error/40 px-lg py-sm text-label-sm font-medium text-error transition-colors hover:bg-error/5"
          >
            <MaterialIcon name="cancel" className="text-[18px]" />
            Hủy đơn hàng
          </button>
        )
      )}
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

  // ── Order building state
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  const [guestName, setCustomerName] = useState('');
  const [guestPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Payment confirmation state
  type PageMode = 'building' | 'confirming';
  const [mode, setMode] = useState<PageMode>('building');
  const [pendingOrder, setPendingOrder] = useState<PendingOrderInfo | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [transferPaid, setTransferPaid] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [showPayosModal, setShowPayosModal] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productService.getStaffInstoreProducts(),
        productService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    };
    void load();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const PRODUCTS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // ── Filtered products
  const filteredProducts = useMemo(() => {
    setCurrentPage(1);
    const kw = deferredSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch = !kw || p.name.toLowerCase().includes(kw);
      const matchCat = !selectedCategory || p.category?.id === selectedCategory;
      return matchSearch && matchCat && p.isActive;
    });
  }, [products, deferredSearch, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );

  const addedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderItems) map.set(item.productId, item.quantity);
    return map;
  }, [orderItems]);

  // ── Cart operations
  const addProduct = (product: Product) => {
    const stock = product.stock ?? 0;
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) return prev;
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
          maxStock: stock,
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
            ? { ...item, quantity: Math.min(qty, item.maxStock) }
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
    setPhoneError(null);
    setNameError(null);
    setNote('');
    setPaymentMethod('CASH');
  };

  const handleNameBlur = () => {
    const trimmed = guestName.trim();
    if (!trimmed) {
      setNameError('Vui lòng nhập tên khách hàng.');
    } else if (!/[a-zA-ZÀ-ỹ].*[a-zA-ZÀ-ỹ]/.test(trimmed)) {
      setNameError('Tên khách hàng phải chứa ít nhất 2 ký tự chữ.');
    } else {
      setNameError(null);
    }
  };

  const handlePhoneBlur = () => {
    const trimmed = guestPhone.trim();
    if (!trimmed) {
      setPhoneError('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    if (/\D/.test(trimmed)) {
      setPhoneError('Số điện thoại chỉ được chứa ký tự số.');
      return;
    }
    if (!isValidVnPhone(trimmed)) {
      setPhoneError('Số điện thoại không hợp lệ.');
    } else {
      setPhoneError(null);
    }
  };

  // ── Totals
  const subtotalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vatAmount = Math.round(subtotalAmount * 0.1);
  const totalAmount = subtotalAmount + vatAmount;
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  // ── Form validation check
  const isFormValid = useMemo(() => {
    if (orderItems.length === 0) return false;
    const trimmedName = guestName.trim();
    if (!trimmedName || !/[a-zA-ZÀ-ỹ].*[a-zA-ZÀ-ỹ]/.test(trimmedName)) return false;
    const trimmedPhone = guestPhone.trim();
    if (!trimmedPhone || !isValidVnPhone(trimmedPhone)) return false;
    if (nameError || phoneError) return false;
    return true;
  }, [orderItems, guestName, guestPhone, nameError, phoneError]);

  // ── Transfer polling
  const startTransferPolling = (orderId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const status = await orderService.getInStorePaymentStatus(orderId);
        // Chấp nhận cả giá trị chuẩn mới ("PAID") lẫn dữ liệu cũ ("completed").
        if (['PAID', 'COMPLETED', 'SUCCESS'].includes(status.toUpperCase())) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setTransferPaid(true);
          toast.success('Khách đã chuyển khoản thành công!');
          setTimeout(() => {
            setShowPayosModal(false);
            handleNewOrder();
          }, 2500);
        }
      } catch { /* silent */ }
    }, 3000);
  };

  // ── Submit
  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng.');
      return;
    }
    let hasError = false;
    const trimmedName = guestName.trim();
    if (!trimmedName) {
      setNameError('Vui lòng nhập tên khách hàng.');
      hasError = true;
    } else if (!/[a-zA-ZÀ-ỹ].*[a-zA-ZÀ-ỹ]/.test(trimmedName)) {
      setNameError('Tên khách hàng phải chứa ít nhất 2 ký tự chữ.');
      hasError = true;
    }
    const trimmedPhone = guestPhone.trim();
    if (!trimmedPhone) {
      setPhoneError('Vui lòng nhập số điện thoại khách hàng.');
      hasError = true;
    } else if (/\D/.test(trimmedPhone)) {
      setPhoneError('Số điện thoại chỉ được chứa ký tự số.');
      hasError = true;
    } else {
      if (!isValidVnPhone(trimmedPhone)) {
        setPhoneError('Số điện thoại không hợp lệ.');
        hasError = true;
      }
    }
    if (hasError) {
      toast.warning('Vui lòng hoàn thành chính xác thông tin khách hàng.');
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
        guestName: guestName.trim(),
        guestPhone: trimmedPhone,
      };
      const created = await orderService.createInStoreOrder(payload);

      const info: PendingOrderInfo = {
        id: created.id,
        totalAmount,
        subtotalAmount,
        vatAmount,
        paymentMethod,
        items: [...orderItems],
      };
      setPendingOrder(info);
      setMode('confirming');
      setTransferPaid(false);

      if (paymentMethod === 'TRANSFER') {
        setLoadingQr(true);
        try {
          const url = await orderService.getInStorePayosLink(created.id);
          setCheckoutUrl(url);
          startTransferPolling(created.id);
          // Auto-open the PayOS modal so staff sees it immediately
          setShowPayosModal(true);
        } catch {
          toast.warning('Không tạo được liên kết thanh toán. Vui lòng thử lại.');
        } finally {
          setLoadingQr(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tạo đơn hàng thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm cash payment
  const handleConfirmCash = async () => {
    if (!pendingOrder) return;
    setConfirmingCash(true);
    try {
      await orderService.completeInStoreOrder(pendingOrder.id);
      toast.success('Thanh toán thành công! Đơn hàng đã hoàn tất.');
      handleNewOrder();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xác nhận thanh toán thất bại.';
      toast.error(msg);
    } finally {
      setConfirmingCash(false);
    }
  };

  // ── Cancel order
  const handleCancelOrder = async () => {
    if (!pendingOrder || !cancelReason.trim()) return;
    setCancellingOrder(true);
    try {
      await orderService.staffCancelOrder(pendingOrder.id, cancelReason.trim());
      toast.success('Đã hủy đơn hàng. Tồn kho đã được hoàn lại.');
      handleNewOrder();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hủy đơn thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setCancellingOrder(false);
    }
  };

  // ── Reset to new order
  const handleNewOrder = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setMode('building');
    setPendingOrder(null);
    setCheckoutUrl('');
    setTransferPaid(false);
    setShowPayosModal(false);
    setShowCancelForm(false);
    setCancelReason('');
    clearOrder();
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
          <section className="min-w-0 flex-[3] space-y-md">
            {/* Search + Category filter */}
            <div className="space-y-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-sm">
              <div className="relative">
                <MaterialIcon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-[20px] text-secondary" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-border/60 bg-bg-base py-sm pl-10 pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')}
                    className="absolute right-sm top-1/2 -translate-y-1/2 p-xs text-secondary hover:text-on-surface">
                    <MaterialIcon name="close" className="text-[16px]" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-xs">
                <button type="button" onClick={() => setSelectedCategory('')}
                  className={`rounded-full px-md py-xs text-label-sm transition-colors ${!selectedCategory ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-secondary hover:bg-surface-container'}`}>
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button key={cat.id} type="button"
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                    className={`rounded-full px-md py-xs text-label-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-secondary hover:bg-surface-container'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-label-sm text-secondary">
              {loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm`}
            </p>

            {loading ? (
              <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-xl border border-slate-border/50 bg-bg-card" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-md rounded-xl border border-slate-border/50 bg-bg-card text-secondary">
                <MaterialIcon name="inventory_2" className="text-[48px]" />
                <p className="text-body-md">Không tìm thấy sản phẩm phù hợp</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
                  {pagedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      addedQty={addedQtyMap.get(product.id) ?? 0}
                      onAdd={mode === 'building' ? addProduct : () => { }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <StaffPagination
                  current={currentPage}
                  totalPages={totalPages}
                  onChange={setCurrentPage}
                  totalLabel={`Tổng ${filteredProducts.length} sản phẩm`}
                />
              </>
            )}
          </section>

          {/* ── Right: Order panel / Payment panel ───────────────────── */}
          <aside className="sticky top-4 w-[420px] shrink-0 space-y-md">
            {mode === 'confirming' && pendingOrder ? (
              <PaymentPanel
                order={pendingOrder}
                checkoutUrl={checkoutUrl}
                loadingQr={loadingQr}
                transferPaid={transferPaid}
                confirmingCash={confirmingCash}
                showCancelForm={showCancelForm}
                cancelReason={cancelReason}
                cancellingOrder={cancellingOrder}
                onConfirmCash={handleConfirmCash}
                onNewOrder={handleNewOrder}
                onShowPayosModal={() => setShowPayosModal(true)}
                onShowCancelForm={() => setShowCancelForm(true)}
                onHideCancelForm={() => { setShowCancelForm(false); setCancelReason(''); }}
                onCancelReasonChange={setCancelReason}
                onCancelOrder={handleCancelOrder}
              />
            ) : (
              <>
                {/* Order items card */}
                <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
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
                      <button type="button" onClick={clearOrder}
                        className="flex items-center gap-xs text-label-xs text-secondary hover:text-error">
                        <MaterialIcon name="delete_sweep" className="text-[16px]" />
                        Xóa hết
                      </button>
                    )}
                  </div>

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
                    <div className="space-y-xs">
                      <input type="text" placeholder="Tên khách hàng *"
                        value={guestName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setNameError(null);
                        }}
                        onBlur={handleNameBlur}
                        className={`w-full rounded-lg border bg-bg-base px-md py-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 ${nameError
                          ? 'border-error/50 focus:border-error focus:ring-error/30'
                          : 'border-slate-border/60 focus:border-primary focus:ring-primary/30'
                          }`} />
                      {nameError && (
                        <p className="mt-1 block text-label-xs text-error">{nameError}</p>
                      )}
                    </div>
                    <div className="space-y-xs">
                      <input type="tel" placeholder="Số điện thoại *"
                        value={guestPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setPhoneError(null);
                        }}
                        onBlur={handlePhoneBlur}
                        className={`w-full rounded-lg border bg-bg-base px-md py-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 ${phoneError
                          ? 'border-error/50 focus:border-error focus:ring-error/30'
                          : 'border-slate-border/60 focus:border-primary focus:ring-primary/30'
                          }`} />
                      {phoneError && (
                        <p className="mt-1 block text-label-xs text-error">{phoneError}</p>
                      )}
                    </div>
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
                        <label key={method.value}
                          className={`flex cursor-pointer items-center gap-sm rounded-lg border p-sm transition-all ${paymentMethod === method.value ? 'border-primary bg-primary-light text-primary' : 'border-slate-border/50 text-secondary hover:border-primary/40 hover:bg-surface-container-low'}`}>
                          <input type="radio" name="paymentMethod" value={method.value}
                            checked={paymentMethod === method.value}
                            onChange={() => setPaymentMethod(method.value)} className="hidden" />
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
                    <textarea rows={2} placeholder="Ghi chú đơn hàng (tuỳ chọn)"
                      value={note} onChange={(e) => setNote(e.target.value)}
                      className="w-full resize-none rounded-lg border border-slate-border/60 bg-bg-base px-sm py-xs text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>

                  <hr className="border-slate-border/40" />

                  {/* Total breakdown */}
                  <div className="space-y-xs">
                    <div className="flex items-center justify-between text-body-sm text-secondary">
                      <span>Tiền hàng</span>
                      <span>{formatVND(subtotalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm text-secondary">
                      <span>Thuế VAT (10%)</span>
                      <span>{formatVND(vatAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-border/40 pt-xs">
                      <span className="text-body-md font-semibold text-on-surface">Tổng cộng</span>
                      <span className="text-xl font-bold text-primary">{formatVND(totalAmount)}</span>
                    </div>
                  </div>

                  {totalItems > 0 && (
                    <p className="text-right text-label-xs text-secondary">
                      {totalItems} sản phẩm · {orderItems.length} loại
                    </p>
                  )}

                  {/* Create order button */}
                  <button type="button"
                    disabled={!isFormValid || submitting}
                    onClick={handleCreateOrder}
                    className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-md text-label-md font-semibold text-on-primary shadow-md transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
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
              </>
            )}
          </aside>
        </div>
      </div>

      {/* PayOS payment modal (TRANSFER) */}
      {showPayosModal && pendingOrder && checkoutUrl && (
        <PayosPaymentModal
          checkoutUrl={checkoutUrl}
          totalAmount={pendingOrder.totalAmount}
          transferPaid={transferPaid}
          onClose={() => setShowPayosModal(false)}
        />
      )}
    </StaffLayout>
  );
};

export default StaffInStoreOrderPage;
