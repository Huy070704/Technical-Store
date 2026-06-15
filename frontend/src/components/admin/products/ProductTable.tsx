import type { Product } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';
import ProductStatusBadge from './ProductStatusBadge';

type ProductTableProps = {
  products: Product[];
  totalCount?: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const getStockPercent = (stock: number) => Math.max(0, Math.min(100, Math.round((stock / 340) * 100)));

const getStockColor = (stock: number) => {
  if (stock === 0) return 'bg-secondary';
  if (stock < 20) return 'bg-error';
  return 'bg-tertiary';
};

const ProductTable = ({
  products,
  totalCount = products.length,
  currentPage,
  pageSize,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: ProductTableProps) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalCount);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
  });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-border bg-bg-soft">
              {['Tên sản phẩm', 'SKU', 'Giá', 'Tồn kho', 'Trạng thái', 'Thao tác'].map((header) => (
                <th
                  key={header}
                  className={`px-lg py-md text-label-md uppercase text-secondary ${header === 'Thao tác' || header === 'Tồn kho' ? 'text-center' : ''
                    }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border/30">
            {products.length === 0 ? (
              <tr>
                <td className="px-lg py-xl text-center text-body-sm text-secondary" colSpan={6}>
                  Không tìm thấy sản phẩm nào.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-surface-container-low"
                >
                  <td className="px-lg py-md cursor-pointer" onClick={() => onView(product)}>
                    <div className="flex items-center gap-md">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                        <img alt={product.name} className="h-full w-full object-cover" src={product.image} />
                      </div>
                      <div>
                        <div className="text-label-md text-on-surface">{product.name}</div>
                        <div className="text-body-sm text-secondary">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md font-mono text-body-sm text-on-surface-variant cursor-pointer" onClick={() => onView(product)}>{product.sku}</td>
                  <td className="px-lg py-md text-label-md text-on-surface cursor-pointer" onClick={() => onView(product)}>{formatCurrency(product.price)}</td>
                  <td className="px-lg py-md text-center cursor-pointer" onClick={() => onView(product)}>
                    <div className={`text-label-md ${product.stock < 20 && product.stock > 0 ? 'text-error' : 'text-on-surface'}`}>
                      {product.stock}
                    </div>
                    <div className="mt-xs h-1 w-full overflow-hidden rounded-full bg-slate-border/20">
                      <div className={`h-full ${getStockColor(product.stock)}`} style={{ width: `${getStockPercent(product.stock)}%` }} />
                    </div>
                  </td>
                  <td className="px-lg py-md cursor-pointer" onClick={() => onView(product)}>
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="px-lg py-md text-center">
                    <div className="flex items-center justify-center gap-xs">
                      <button
                        aria-label={`View ${product.name}`}
                        className="rounded p-xs text-secondary transition-all hover:bg-surface-container hover:text-on-surface"
                        onClick={() => onView(product)}
                        type="button"
                      >
                        <MaterialIcon name="visibility" />
                      </button>
                      <button
                        aria-label={`Edit ${product.name}`}
                        className="rounded p-xs text-secondary transition-all hover:bg-primary-light hover:text-primary"
                        onClick={() => onEdit(product)}
                        type="button"
                      >
                        <MaterialIcon name="edit" />
                      </button>
                      <button
                        aria-label={`Delete ${product.name}`}
                        className="rounded p-xs text-secondary transition-all hover:bg-error-container hover:text-error"
                        onClick={() => onDelete(product)}
                        type="button"
                      >
                        <MaterialIcon name="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
        <span className="text-body-sm text-secondary">
          Hiển thị {startEntry} đến {endEntry} trong tổng số {totalCount} mục
        </span>
        <div className="flex items-center gap-xs">
          <PaginationIcon
            disabled={currentPage === 1}
            icon="chevron_left"
            label="Trang trước"
            onClick={() => onPageChange(currentPage - 1)}
          />
          {pageNumbers.map((page, index) => {
            const previousPage = pageNumbers[index - 1];
            const showGap = previousPage && page - previousPage > 1;

            return (
              <span key={page} className="flex items-center gap-xs">
                {showGap && <span className="px-xs text-secondary">...</span>}
                <button
                  className={`h-9 min-w-9 rounded-lg px-sm text-label-md transition-colors ${page === currentPage ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-bg-soft'
                    }`}
                  onClick={() => onPageChange(page)}
                  type="button"
                >
                  {page}
                </button>
              </span>
            );
          })}
          <PaginationIcon
            disabled={currentPage === totalPages}
            icon="chevron_right"
            label="Trang sau"
            onClick={() => onPageChange(currentPage + 1)}
          />
        </div>
      </div>
    </section>
  );
};

type PaginationIconProps = {
  disabled: boolean;
  icon: string;
  label: string;
  onClick: () => void;
};

const PaginationIcon = ({ disabled, icon, label, onClick }: PaginationIconProps) => (
  <button
    aria-label={label}
    className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <MaterialIcon name={icon} />
  </button>
);

export default ProductTable;
