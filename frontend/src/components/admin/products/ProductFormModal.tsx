import { useEffect, useState, type FormEvent } from 'react';
import type { ProductDetail } from '../types/admin';
import type { Category, SaveProductPayload } from '@/types/product';
import { feedbackService } from '@/services/feedbackService';
import MaterialIcon from '../shared/MaterialIcon';

type ProductFormModalProps = {
  categories: Category[];
  product?: ProductDetail | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: SaveProductPayload) => void;
};

type SpecEntry = { key: string; value: string };

type FormState = {
  name: string;
  price: string;
  stock: string;
  categoryId: string;
  description: string;
  imageUrls: string[];
  specs: SpecEntry[];
  specifications: Record<string, string>;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  price: '0',
  stock: '0',
  categoryId: '',
  description: '',
  imageUrls: [],
  specs: [],
  specifications: {},
  isActive: true,
};

const getCategoryKey = (category?: Category | null): string => {
  if (!category) return "";
  const raw = (category.slug || category.name || "").trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
};

const CATEGORY_FIELDS_SCHEMA: Record<string, string[]> = {
  laptop: ["brand", "model", "screenSize", "screenType", "resolution", "batteryLifeHours", "weightKg", "os", "ramCount"],
  ram: ["brand", "model", "capacityGb", "speedMhz", "type"],
  cpu: ["cores", "threads", "baseClock", "boostClock", "socket", "architecture", "tdp", "integratedGraphics"],
  gpu: ["brand", "model", "vram", "chipset", "memoryType", "lengthMm"],
  monitor: ["brand", "model", "sizeInch", "resolution", "refreshRate", "panelType"],
  motherboard: ["brand", "model", "chipset", "socket", "formFactor", "ramSlots", "maxRam"],
  psu: ["brand", "model", "wattage"],
  drive: ["brand", "model", "type", "capacityGb", "interface"],
  cooler: ["brand", "model", "type", "supportedSockets", "fanSizeMm"],
  pc: ["brand", "model", "processor", "ramGb", "storageGb", "storageType", "graphics", "formFactor", "powerSupplyWattage", "operatingSystem"],
  "network-card": ["type", "interface", "speedMbps"],
  case: ["brand", "model", "formFactorSupport", "hasRgb", "sidePanelType", "maxGpuLengthMm", "psuType"],
  mouse: ["type", "dpi", "connectivity", "hasRgb"],
  keyboard: ["type", "switchType", "connectivity", "layout", "hasRgb"],
  headset: ["hasMicrophone", "connectivity", "surroundSound"],
};

const FIELD_METADATA: Record<string, { label: string; type: "text" | "number" | "boolean"; required?: boolean }> = {
  brand: { label: "Hãng sản xuất", type: "text" },
  model: { label: "Model", type: "text" },
  screenSize: { label: "Kích thước màn hình (inch)", type: "number" },
  screenType: { label: "Loại màn hình", type: "text" },
  resolution: { label: "Độ phân giải", type: "text" },
  batteryLifeHours: { label: "Thời lượng pin (giờ)", type: "number" },
  weightKg: { label: "Trọng lượng (kg)", type: "number" },
  os: { label: "Hệ điều hành", type: "text" },
  ramCount: { label: "Số khe RAM", type: "number" },
  capacityGb: { label: "Dung lượng (GB)", type: "number", required: true },
  speedMhz: { label: "Tốc độ Bus (MHz)", type: "number", required: true },
  type: { label: "Phân loại / Loại", type: "text", required: true },
  cores: { label: "Số nhân", type: "number", required: true },
  threads: { label: "Số luồng", type: "number", required: true },
  baseClock: { label: "Xung nhịp cơ bản", type: "text", required: true },
  boostClock: { label: "Xung nhịp tối đa", type: "text", required: true },
  socket: { label: "Socket hỗ trợ", type: "text", required: true },
  architecture: { label: "Kiến trúc", type: "text", required: true },
  tdp: { label: "TDP (W)", type: "number", required: true },
  integratedGraphics: { label: "Đồ họa tích hợp", type: "text" },
  vram: { label: "Dung lượng VRAM (GB)", type: "number", required: true },
  chipset: { label: "Chipset", type: "text", required: true },
  memoryType: { label: "Loại bộ nhớ", type: "text", required: true },
  lengthMm: { label: "Chiều dài (mm)", type: "number", required: true },
  sizeInch: { label: "Kích thước màn hình (inch)", type: "number", required: true },
  refreshRate: { label: "Tần số quét (Hz)", type: "number", required: true },
  panelType: { label: "Loại tấm nền", type: "text", required: true },
  formFactor: { label: "Chuẩn kích thước (Form Factor)", type: "text", required: true },
  ramSlots: { label: "Số khe RAM hỗ trợ", type: "number", required: true },
  maxRam: { label: "RAM tối đa (GB)", type: "number", required: true },
  wattage: { label: "Công suất (W)", type: "number", required: true },
  interface: { label: "Giao tiếp / Kết nối", type: "text", required: true },
  supportedSockets: { label: "Sockets hỗ trợ", type: "text", required: true },
  fanSizeMm: { label: "Kích thước quạt (mm)", type: "number", required: true },
  processor: { label: "Bộ vi xử lý (CPU)", type: "text", required: true },
  ramGb: { label: "Dung lượng RAM (GB)", type: "number", required: true },
  storageGb: { label: "Dung lượng ổ cứng (GB)", type: "number", required: true },
  storageType: { label: "Loại ổ cứng", type: "text", required: true },
  graphics: { label: "Card đồ họa (GPU)", type: "text", required: true },
  powerSupplyWattage: { label: "Công suất nguồn (W)", type: "number", required: true },
  operatingSystem: { label: "Hệ điều hành", type: "text", required: true },
  speedMbps: { label: "Tốc độ (Mbps)", type: "number", required: true },
  formFactorSupport: { label: "Hỗ trợ Mainboard", type: "text", required: true },
  hasRgb: { label: "Đèn LED RGB", type: "boolean", required: true },
  sidePanelType: { label: "Loại mặt bên", type: "text", required: true },
  maxGpuLengthMm: { label: "Chiều dài GPU tối đa (mm)", type: "number" },
  psuType: { label: "Chuẩn nguồn hỗ trợ", type: "text" },
  dpi: { label: "Độ phân giải (DPI)", type: "number", required: true },
  connectivity: { label: "Kết nối", type: "text", required: true },
  switchType: { label: "Loại Switch", type: "text", required: true },
  layout: { label: "Bố cục phím (Layout)", type: "text", required: true },
  hasMicrophone: { label: "Có Microphone", type: "boolean", required: true },
  surroundSound: { label: "Âm thanh vòm", type: "boolean", required: true },
};

const specsToEntries = (specs?: Record<string, string>): SpecEntry[] => {
  if (!specs) return [];
  const obj = typeof specs === 'object' && !(specs instanceof Map) ? specs : {};
  return Object.entries(obj)
    .filter(([k]) => k !== '$__' && k !== '_doc')
    .map(([key, value]) => ({ key, value: String(value) }));
};

const entriesToRecord = (entries: SpecEntry[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const { key, value } of entries) {
    const trimmedKey = key.trim();
    if (trimmedKey) result[trimmedKey] = value.trim();
  }
  return result;
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

    const idExists = categories.some(c => (c.id || (c as any)._id) === catId);

    if ((!catId || !idExists) && product.category) {
      const categoryName =
        typeof product.category === "string"
          ? product.category
          : product.category.name;

      const foundByName = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (foundByName) {
        catId = foundByName.id || (foundByName as any)._id || '';
      }
    }

    // Load existing images
    let initialUrls: string[] = [];
    if (product.images && product.images.length > 0) {
      initialUrls = product.images.map(img => img.url).filter(Boolean);
    } else if (product.image && !product.image.startsWith('/img/') && product.image !== '/img/logo.png') {
      initialUrls = [product.image];
    }

    // Gộp tất cả thông số kỹ thuật từ product.specifications và root của product
    const specsMap: Record<string, string> = {};
    if (product.specifications) {
      const rawSpecs = product.specifications instanceof Map
        ? Object.fromEntries(product.specifications.entries())
        : product.specifications;
      for (const [key, value] of Object.entries(rawSpecs)) {
        if (value !== undefined && value !== null) {
          specsMap[key] = String(value);
        }
      }
    }

    const cat = categories.find(c => (c.id || (c as any)._id) === catId);
    const catKey = cat ? getCategoryKey(cat) : "";
    const fieldKeys = CATEGORY_FIELDS_SCHEMA[catKey];

    if (fieldKeys) {
      for (const key of fieldKeys) {
        if (product[key] !== undefined && product[key] !== null) {
          specsMap[key] = String(product[key]);
        }
      }
    }

    // Lọc ra các thông số tùy chỉnh nằm ngoài schema của Category
    const customSpecs: SpecEntry[] = [];
    for (const [key, value] of Object.entries(specsMap)) {
      if (fieldKeys && fieldKeys.includes(key)) {
        continue;
      }
      customSpecs.push({ key, value });
    }

    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock || 0),
      categoryId: catId,
      description: product.description || '',
      imageUrls: initialUrls,
      specs: customSpecs,
      specifications: specsMap,
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

    if (form.imageUrls.length === 0) {
      newErrors.imageUrl = 'Vui lòng chọn ít nhất một hình ảnh sản phẩm.';
    }

    // Validate specs: no duplicate keys
    const keys = form.specs.map(s => s.key.trim()).filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      newErrors.specs = 'Tên thông số bị trùng lặp. Vui lòng kiểm tra lại.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setImageError('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, JPEG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Kích thước mỗi file không được vượt quá 5MB.');
        return;
      }
    }

    try {
      setUploadingImage(true);
      setImageError('');

      const uploadedUrls: string[] = [];
      for (const file of fileList) {
        const result = await feedbackService.uploadImage(file);
        uploadedUrls.push(result.url);
      }

      setForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls],
      }));
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    } catch (err) {
      console.error(err);
      setImageError('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newUrls = form.imageUrls.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, imageUrls: newUrls }));
    if (newUrls.length === 0) {
      setErrors(prev => ({ ...prev, imageUrl: 'Vui lòng chọn ít nhất một hình ảnh sản phẩm.' }));
    } else {
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  // Spec helpers
  const addSpec = () => {
    setForm(prev => ({ ...prev, specs: [...prev.specs, { key: '', value: '' }] }));
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    setForm(prev => {
      const updated = [...prev.specs];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, specs: updated };
    });
    if (errors.specs) setErrors(prev => ({ ...prev, specs: '' }));
  };

  const removeSpec = (index: number) => {
    setForm(prev => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));
  };

  const updateSpecificationField = (key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: val,
      }
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const cat = categories.find(c => (c.id || (c as any)._id) === form.categoryId);
    const catKey = cat ? getCategoryKey(cat) : "";
    const fieldKeys = CATEGORY_FIELDS_SCHEMA[catKey];

    const specificationsPayload: Record<string, string> = {};

    // 1. Lưu các thông số thuộc schema của category
    if (fieldKeys) {
      for (const key of fieldKeys) {
        const val = form.specifications[key];
        if (val !== undefined && val !== null && val.trim() !== '') {
          specificationsPayload[key] = val.trim();
        }
      }
    }

    // 2. Lưu các thông số tùy chọn từ danh sách specs
    const customSpecs = entriesToRecord(form.specs);
    for (const [key, val] of Object.entries(customSpecs)) {
      specificationsPayload[key] = val;
    }

    onSubmit({
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: form.categoryId || undefined,
      description: form.description.trim(),
      imageUrl: form.imageUrls[0] || undefined,
      imageUrls: form.imageUrls,
      specifications: specificationsPayload,
      isActive: form.isActive,
    });
  };

  const updateForm = (field: keyof Omit<FormState, 'imageUrls' | 'specs' | 'specifications'>, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cat = categories.find(c => (c.id || (c as any)._id) === form.categoryId);
  const catKey = cat ? getCategoryKey(cat) : "";
  const fieldKeys = CATEGORY_FIELDS_SCHEMA[catKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header — cố định trên cùng */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-border/50 px-lg py-md">
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

        {/* Body — scroll nếu cần, chia 2 cột */}
        <form
          className="flex-1 overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-border/30">

            {/* ── Cột trái: Thông tin cơ bản + Ảnh ── */}
            <div className="flex flex-col gap-md p-lg">
              <p className="text-label-xs font-semibold uppercase tracking-widest text-secondary/60">
                Thông tin cơ bản
              </p>

              {/* Tên sản phẩm */}
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

              {/* Danh mục */}
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

              {/* Giá + Tồn kho — 2 cột nhỏ trong cột trái */}
              <div className="grid grid-cols-2 gap-md">
                <label className="space-y-xs">
                  <span className="text-label-md text-on-surface">Giá (đ)</span>
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
                  <span className="text-body-xs text-secondary leading-snug">
                    Quản lý tại trang Kho hàng.
                  </span>
                </label>
              </div>

              {/* Ảnh sản phẩm */}
              <div className="space-y-xs">
                <span className="text-label-md text-on-surface">
                  Hình ảnh sản phẩm
                  {form.imageUrls.length > 0 && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-body-xs text-primary font-semibold">
                      {form.imageUrls.length} ảnh
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap gap-3 items-start">
                  {form.imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-border bg-surface-container shadow-sm"
                    >
                      <img alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" src={url} />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-error/90 transition-colors"
                        title="Xóa ảnh này"
                      >
                        <MaterialIcon name="close" className="!text-[12px]" />
                      </button>
                      <span
                        className={`absolute bottom-1 left-1 rounded px-1 py-0.5 text-[9px] font-bold text-white leading-none ${idx === 0 ? 'bg-primary/90' : 'bg-black/60'
                          }`}
                      >
                        {idx === 0 ? 'Chính' : `#${idx + 1}`}
                      </span>
                    </div>
                  ))}

                  {form.imageUrls.length === 0 && (
                    <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-slate-border flex items-center justify-center text-secondary bg-surface-container-low">
                      <MaterialIcon name="image" className="!text-[28px]" />
                    </div>
                  )}

                  <div className="flex flex-col gap-xs self-center">
                    <label
                      className={`cursor-pointer rounded-lg px-md py-sm text-label-md transition-colors border w-fit ${uploadingImage
                        ? 'bg-bg-soft text-secondary border-slate-border cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'
                        }`}
                    >
                      <span className="flex items-center gap-xs">
                        {uploadingImage ? (
                          <>
                            <MaterialIcon name="hourglass_top" className="!text-[16px] animate-spin" />
                            Đang tải lên...
                          </>
                        ) : (
                          <>
                            <MaterialIcon name="add_photo_alternate" className="!text-[16px]" />
                            Chọn ảnh
                          </>
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className="text-body-xs text-secondary">
                      PNG, JPG, JPEG · Tối đa 5MB/ảnh
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

              {/* Active toggle */}
              <label className="flex items-center gap-sm text-label-md text-on-surface mt-auto pt-sm">
                <input
                  checked={form.isActive}
                  className="h-4 w-4 accent-primary"
                  type="checkbox"
                  onChange={(event) => updateForm('isActive', event.target.checked)}
                />
                Đang kinh doanh
              </label>
            </div>

            {/* ── Cột phải: Mô tả + Thông số kỹ thuật ── */}
            <div className="flex flex-col gap-md p-lg">
              <p className="text-label-xs font-semibold uppercase tracking-widest text-secondary/60">
                Mô tả &amp; Thông số
              </p>

              {/* Mô tả */}
              <label className="block space-y-xs">
                <span className="text-label-md text-on-surface">Mô tả</span>
                <textarea
                  className="min-h-[96px] w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                />
              </label>

              {/* Thông số kỹ thuật */}
              <div className="flex flex-col gap-xs flex-1">
                <span className="text-label-md text-on-surface flex items-center gap-xs">
                  <MaterialIcon name="tune" className="!text-[16px] text-primary" />
                  Thông số kỹ thuật
                </span>

                {/* Form dynamic specs theo category */}
                {fieldKeys && fieldKeys.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md p-sm border border-slate-border/50 rounded-lg bg-surface-container-low mb-sm">
                    {fieldKeys.map((key) => {
                      const meta = FIELD_METADATA[key];
                      if (!meta) return null;

                      return (
                        <label key={key} className="space-y-xs block">
                          <span className="text-body-xs font-medium text-secondary">
                            {meta.label} {meta.required && <span className="text-error">*</span>}
                          </span>
                          {meta.type === "boolean" ? (
                            <select
                              value={form.specifications[key] ?? ""}
                              onChange={(e) => updateSpecificationField(key, e.target.value)}
                              required={meta.required}
                              className="w-full rounded-md border border-slate-border bg-bg-card px-sm py-xs text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                              <option value="">-- Chọn --</option>
                              <option value="true">Có</option>
                              <option value="false">Không</option>
                            </select>
                          ) : (
                            <input
                              type={meta.type === "number" ? "number" : "text"}
                              value={form.specifications[key] ?? ""}
                              onChange={(e) => updateSpecificationField(key, e.target.value)}
                              required={meta.required}
                              className="w-full rounded-md border border-slate-border bg-bg-card px-sm py-xs text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Custom Specs (Key-Value) */}
                <div className="space-y-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-body-xs font-semibold uppercase tracking-wider text-secondary">
                      {fieldKeys ? "Thông số tùy chọn khác" : "Danh sách thông số"}
                    </span>
                    <button
                      type="button"
                      onClick={addSpec}
                      className="flex items-center gap-xs rounded-lg bg-primary/10 px-sm py-xs text-[11px] text-primary hover:bg-primary/20 transition-colors border border-primary/20 font-medium"
                    >
                      <MaterialIcon name="add" className="!text-[12px]" />
                      Thêm thông số
                    </button>
                  </div>

                  {errors.specs && (
                    <span className="text-body-xs text-error font-medium">{errors.specs}</span>
                  )}

                  {form.specs.length === 0 ? (
                    <div
                      onClick={addSpec}
                      className="cursor-pointer rounded-lg border-2 border-dashed border-slate-border/60 bg-surface-container-low px-md py-md text-center text-body-sm text-secondary hover:border-primary/40 hover:text-primary/70 transition-colors"
                    >
                      <MaterialIcon name="add_circle_outline" className="!text-[20px] mb-1 opacity-50" />
                      <p className="text-[11px]">Bấm để thêm thông số tùy chỉnh khác</p>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-slate-border/50 bg-surface-container-low p-sm overflow-y-auto max-h-[180px]">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
                        <span className="text-[10px] text-secondary font-medium uppercase">Tên thông số</span>
                        <span className="text-[10px] text-secondary font-medium uppercase">Giá trị</span>
                        <span className="w-7" />
                      </div>

                      {form.specs.map((spec, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Ví dụ: Màu sắc..."
                            value={spec.key}
                            onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                            className="w-full rounded-md border border-slate-border bg-bg-card px-sm py-xs text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="text"
                            placeholder="Ví dụ: Đen..."
                            value={spec.value}
                            onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                            className="w-full rounded-md border border-slate-border bg-bg-card px-sm py-xs text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeSpec(idx)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-error/10 hover:text-error transition-colors"
                            title="Xóa dòng"
                          >
                            <MaterialIcon name="delete_outline" className="!text-[16px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions — cố định dưới cùng */}
          <div className="shrink-0 flex flex-col-reverse gap-sm px-lg py-md border-t border-slate-border/30 sm:flex-row sm:justify-end bg-bg-card">
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
