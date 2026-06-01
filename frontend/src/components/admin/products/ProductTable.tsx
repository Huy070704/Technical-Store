import type { Product } from '../types/admin';
import MaterialIcon from '../shared/MaterialIcon';
import ProductStatusBadge from './ProductStatusBadge';

type ProductTableProps = {
  products: Product[];
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

const ProductTable = ({ products }: ProductTableProps) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-border bg-bg-soft">
              {['Product Name', 'SKU', 'Price', 'Stock', 'Status', 'Actions'].map((header) => (
                <th
                  key={header}
                  className={`px-lg py-md text-label-md uppercase text-secondary ${
                    header === 'Actions' ? 'text-right' : header === 'Stock' ? 'text-center' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border/30">
            {products.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-surface-container-low">
                <td className="px-lg py-md">
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
                <td className="px-lg py-md font-mono text-body-sm text-on-surface-variant">{product.sku}</td>
                <td className="px-lg py-md text-label-md text-on-surface">{formatCurrency(product.price)}</td>
                <td className="px-lg py-md text-center">
                  <div className={`text-label-md ${product.stock < 20 && product.stock > 0 ? 'text-error' : 'text-on-surface'}`}>
                    {product.stock}
                  </div>
                  <div className="mt-xs h-1 w-full overflow-hidden rounded-full bg-slate-border/20">
                    <div className={`h-full ${getStockColor(product.stock)}`} style={{ width: `${getStockPercent(product.stock)}%` }} />
                  </div>
                </td>
                <td className="px-lg py-md">
                  <ProductStatusBadge status={product.status} />
                </td>
                <td className="px-lg py-md text-right">
                  <button
                    aria-label={`Edit ${product.name}`}
                    className="rounded p-xs text-secondary transition-all hover:bg-primary-light hover:text-primary"
                    type="button"
                  >
                    <MaterialIcon name="edit" />
                  </button>
                  <button
                    aria-label={`Delete ${product.name}`}
                    className="rounded p-xs text-secondary transition-all hover:bg-error-container hover:text-error"
                    type="button"
                  >
                    <MaterialIcon name="delete" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
        <span className="text-body-sm text-secondary">Showing 1 to {products.length} of 1,284 entries</span>
        <div className="flex items-center gap-xs">
          <PaginationIcon icon="chevron_left" label="Previous page" />
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              className={`rounded-lg px-sm py-1 text-label-md transition-colors ${
                page === 1 ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-bg-soft'
              }`}
              type="button"
            >
              {page}
            </button>
          ))}
          <span className="px-sm text-secondary">...</span>
          <button className="rounded-lg px-sm py-1 text-label-md text-secondary transition-colors hover:bg-bg-soft" type="button">
            321
          </button>
          <PaginationIcon icon="chevron_right" label="Next page" />
        </div>
      </div>
    </section>
  );
};

type PaginationIconProps = {
  icon: string;
  label: string;
};

const PaginationIcon = ({ icon, label }: PaginationIconProps) => (
  <button aria-label={label} className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft" type="button">
    <MaterialIcon name={icon} />
  </button>
);

export default ProductTable;
