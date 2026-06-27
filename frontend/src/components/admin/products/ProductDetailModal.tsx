import type { Product } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';
import ProductStatusBadge from './ProductStatusBadge';

type ProductDetailModalProps = {
  product: Product;
  onClose: () => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const ProductDetailModal = ({ product, onClose }: ProductDetailModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-bg-card shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md shrink-0">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Chi tiết sản phẩm
            </h2>
            <p className="text-body-sm text-secondary">Thông tin chi tiết về sản phẩm trong hệ thống.</p>
          </div>
          <button
            aria-label="Đóng chi tiết sản phẩm"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="p-lg overflow-y-auto space-y-lg">
          <div className="flex flex-col md:flex-row gap-lg">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-container border border-slate-border">
                <img 
                  alt={product.name} 
                  className="h-full w-full object-cover" 
                  src={product.image} 
                />
              </div>
            </div>
            
            <div className="w-full md:w-2/3 space-y-md">
              <div>
                <h3 className="text-title-lg font-bold text-on-surface mb-xs">{product.name}</h3>
                <div className="flex items-center gap-sm">
                  <ProductStatusBadge status={product.status} />
                  {product.isActive ? (
                    <span className="text-xs font-medium text-success bg-success-container px-2 py-1 rounded">Đang kinh doanh</span>
                  ) : (
                    <span className="text-xs font-medium text-secondary bg-surface-container px-2 py-1 rounded">Ngừng kinh doanh</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-sm gap-x-md">
                <div>
                  <div className="text-label-sm text-secondary">SKU</div>
                  <div className="font-mono text-body-md text-on-surface">{product.sku}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Danh mục</div>
                  <div className="text-body-md text-on-surface">{product.category}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Giá bán</div>
                  <div className="text-body-md font-bold text-primary">{formatCurrency(product.price)}</div>
                </div>
                <div>
                  <div className="text-label-sm text-secondary">Tồn kho</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-title-md font-semibold text-on-surface mb-sm">Mô tả sản phẩm</h4>
            <div className="bg-surface-container-low rounded-lg p-md border border-slate-border">
              {product.description ? (
                <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">{product.description}</p>
              ) : (
                <p className="text-body-md text-secondary italic">Không có mô tả cho sản phẩm này.</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-border/50 px-lg py-md shrink-0 flex justify-end">
          <button
            className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
