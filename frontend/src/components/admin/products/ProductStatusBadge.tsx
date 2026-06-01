import type { ProductStatus } from '../types/admin';

type ProductStatusBadgeProps = {
  status: ProductStatus;
};

const statusClasses: Record<ProductStatus, string> = {
  Active: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'Low Stock': 'bg-error-container text-on-error-container',
  'Out of Stock': 'bg-secondary-fixed text-on-secondary-fixed-variant',
  Archived: 'bg-surface-container-high text-secondary',
};

const dotClasses: Record<ProductStatus, string> = {
  Active: 'bg-tertiary',
  'Low Stock': 'bg-error',
  'Out of Stock': 'bg-secondary',
  Archived: 'bg-secondary',
};

const ProductStatusBadge = ({ status }: ProductStatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center rounded-full px-sm py-1 text-label-xs ${statusClasses[status]}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dotClasses[status]}`} />
      {status}
    </span>
  );
};

export default ProductStatusBadge;
