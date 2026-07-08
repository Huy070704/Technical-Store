import { useEffect, useState, type FormEvent } from 'react';
import type { Product } from '../types/admin';
import type { Category, SaveProductPayload } from '@/types/product';
import { feedbackService } from '@/services/feedbackService';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (!product) {
      setForm(emptyForm);
      setErrors({});
      setImageError('');
      return;
    }

    let catId = '';
    const rawCatId = product.categoryId;
    if (rawCatId) {
      if (typeof rawCatId === 'object') {
        const obj = rawCatId as any;
        catId = obj.id || obj._id || '';
      } else {
        catId = String(rawCatId);
      }
    }

    // Match by ID first, and check if it exists in categories list
    const idExists = categories.some(c => (c.id || (c as any)._id) === catId);

    // Fallback: match by category name if ID is not found or not in list
    if ((!catId || !idExists) && product.category) {
      const foundByName = categories.find(
        (c) => c.name.toLowerCase() === product.category.toLowerCase()
      );
      if (foundByName) {
        catId = foundByName.id || (foundByName as any)._id || '';
      }
    }

    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock || 0),
      categoryId: catId,
      description: product.description || '',
      imageUrl: product.image.startsWith('/img/') || product.image === '/img/logo.png' ? '' : product.image,
      isActive: product.isActive ?? product.status !== 'Archived',
    });
    setErrors({});
    setImageError('');
  }, [product, categories]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Tên sản phẩm không được để trống.';
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Tên sản phẩm phải có ít nhất 3 ký tự.';
    }

    if (!form.categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục sản phẩm.';
    }

    const priceNum = Number(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Giá bán phải là số lớn hơn 0.';
    }

    if (!form.imageUrl) {
      newErrors.imageUrl = 'Vui lòng chọn hình ảnh sản phẩm.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, JPEG).');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Kích thước file không được vượt quá 5MB.');
      return;
    }

    try {
      setUploadingImage(true);
      setImageError('');
      const result = await feedbackService.uploadImage(file);
      updateForm('imageUrl', result.url);
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    } catch (err) {
      console.error(err);
      setImageError('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

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
      <div className="w-full max-w-2xl rounded-lg bg-bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              {product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
            </h2>
            <p className="text-body-sm text-secondary">Lưu thông tin sản phẩm vào kho hàng.</p>
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

        <form className="space-y-md p-lg overflow-y-auto max-h-[75vh]" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Tên sản phẩm</span>
              <input
                className={`w-full rounded-lg border bg-surface-container-low px-md py-sm text-body-sm focus:outline-none focus:ring-2 ${errors.name
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-border focus:border-primary focus:ring-primary/20'
                  }`}
                required
                value={form.name}
                onChange={(event) => {
                  updateForm('name', event.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
              />
              {errors.name && <span className="text-body-xs text-error font-medium">{errors.name}</span>}
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Danh mục</span>
              <select
                className={`w-full rounded-lg border bg-surface-container-low px-md py-sm text-body-sm focus:outline-none focus:ring-2 ${errors.categoryId
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-border focus:border-primary focus:ring-primary/20'
                  }`}
                value={form.categoryId}
                onChange={(event) => {
                  updateForm('categoryId', event.target.value);
                  if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' }));
                }}
              >
                <option value="">Chưa phân loại</option>
                {categories.map((category) => {
                  const id = category.id || (category as any)._id;
                  return (
                    <option key={id} value={id}>
                      {category.name}
                    </option>
                  );
                })}
              </select>
              {errors.categoryId && <span className="text-body-xs text-error font-medium">{errors.categoryId}</span>}
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Giá (USD)</span>
              <input
                className={`w-full rounded-lg border bg-surface-container-low px-md py-sm text-body-sm focus:outline-none focus:ring-2 ${errors.price
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-border focus:border-primary focus:ring-primary/20'
                  }`}
                min="0"
                required
                step="0.01"
                type="number"
                value={form.price}
                onChange={(event) => {
                  updateForm('price', event.target.value);
                  if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                }}
              />
              {errors.price && <span className="text-body-xs text-error font-medium">{errors.price}</span>}
            </label>

            <label className="space-y-xs">
              <span className="text-label-md text-on-surface">Tồn kho</span>
              <input
                className="w-full cursor-not-allowed rounded-lg border border-slate-border bg-bg-soft px-md py-sm text-body-sm text-secondary focus:outline-none"
                disabled
                readOnly
                type="number"
                value={form.stock}
              />
              <span className="text-body-xs text-secondary">
                Quản lý tồn kho tại trang Kho hàng (theo từng chi nhánh).
              </span>
            </label>
          </div>

          <div className="block space-y-xs">
            <span className="text-label-md text-on-surface">Hình ảnh sản phẩm</span>
            <div className="mt-1 flex items-center gap-md">
              {form.imageUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-border bg-surface-container">
                  <img
                    alt="Preview"
                    className="h-full w-full object-cover"
                    src={form.imageUrl}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateForm('imageUrl', '');
                      if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: '' }));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                    title="Xóa ảnh"
                  >
                    <MaterialIcon name="close" className="!text-[14px]" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-slate-border flex items-center justify-center text-secondary bg-surface-container-low">
                  <MaterialIcon name="image" className="!text-[28px]" />
                </div>
              )}
              <div className="flex flex-col gap-xs">
                <label className="cursor-pointer rounded-lg bg-primary/10 px-md py-sm text-label-md text-primary transition-colors hover:bg-primary/20 border border-primary/20 w-fit">
                  <span>{uploadingImage ? 'Đang tải lên...' : 'Chọn file'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-body-xs text-secondary">
                  Chấp nhận PNG, JPG, JPEG (tối đa 5MB)
                </span>
                {errors.imageUrl && (
                  <span className="text-body-xs text-error font-medium">{errors.imageUrl}</span>
                )}
                {imageError && (
                  <span className="text-body-xs text-error font-medium">{imageError}</span>
                )}
              </div>
            </div>
          </div>

          <label className="block space-y-xs">
            <span className="text-label-md text-on-surface">Mô tả</span>
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
            Đang kinh doanh
          </label>

          <div className="flex flex-col-reverse gap-sm pt-sm sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-border px-lg py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft"
              disabled={saving || uploadingImage}
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>
            <button
              className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || uploadingImage}
              type="submit"
            >
              {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
