import { useEffect, useState, type FormEvent } from 'react';
import type { Product } from '../types/admin';
import type { Category, SaveProductPayload } from '@/types/product';
import MaterialIcon from '../shared/MaterialIcon';

type ProductFormModalProps = {
  categories: Category[];
  product?: Product | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: SaveProductPayload) => void;
};

type FormState = {
  name: string;
  price: string;
  stock: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  price: '0',
  stock: '0',
  categoryId: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

const ProductFormModal = ({
  categories,
  product,
  saving = false,
  onClose,
  onSubmit,
}: ProductFormModalProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!product) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId || '',
      description: product.description || '',
      imageUrl: product.image.startsWith('/img/') ? '' : product.image,
      isActive: product.isActive ?? product.status !== 'Archived',
    });
  }, [product]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: form.categoryId || undefined,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      isActive: form.isActive,
    });
  };

  const updateForm = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div className="w-full max-w-2xl rounded-lg bg-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              {product ? 'Edit Product' : 'Add Product'}
            </h2>
            <p className="text-body-sm text-secondary">Save product details to backend inventory.</p>
          </div>
          <button
            aria-label="Close product form"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <form className="space-y-md p-lg" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Name</span>
              <input
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Category</span>
              <select
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Price</span>
              <input
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="0"
                required
                step="0.01"
                type="number"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
              />
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Stock</span>
              <input
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="0"
                required
                step="1"
                type="number"
                value={form.stock}
                onChange={(event) => updateForm('stock', event.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-xs">
            <span className="text-label-md text-on-surface">Image URL</span>
            <input
              className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://..."
              type="url"
              value={form.imageUrl}
              onChange={(event) => updateForm('imageUrl', event.target.value)}
            />
          </label>

          <label className="block space-y-xs">
            <span className="text-label-md text-on-surface">Description</span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
            />
          </label>

          <label className="flex items-center gap-sm text-label-md text-on-surface">
            <input
              checked={form.isActive}
              className="h-4 w-4 accent-primary"
              type="checkbox"
              onChange={(event) => updateForm('isActive', event.target.checked)}
            />
            Active product
          </label>

          <div className="flex flex-col-reverse gap-sm pt-sm sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-border px-lg py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
