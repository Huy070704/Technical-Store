import { useEffect, useMemo, useState } from 'react';
import type { InventoryBreakdown, InventoryItem, StockAdjustmentMode } from '@/services/inventoryService';
import MaterialIcon from '../shared/MaterialIcon';

type AdjustStockModalProps = {
  item: InventoryItem;
  facilities: { id: string; name: string }[];
  managerFacilityId?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    productId: string;
    facilityId: string;
    mode: StockAdjustmentMode;
    quantity: number;
    reason?: string;
  }) => Promise<void>;
};

const MODE_OPTIONS: { value: StockAdjustmentMode; label: string; description: string }[] = [
  { value: 'add', label: 'Nhập hàng', description: 'Thêm số lượng vào tồn kho hiện tại' },
  { value: 'set', label: 'Kiểm kê', description: 'Đặt số lượng chính xác sau kiểm kê' },
  { value: 'subtract', label: 'Giảm tồn', description: 'Trừ tồn khi sửa sai lệch hoặc hàng hỏng' },
];

const AdjustStockModal = ({
  item,
  facilities,
  managerFacilityId,
  saving,
  onClose,
  onSubmit,
}: AdjustStockModalProps) => {
  const availableFacilities = useMemo(() => {
    if (managerFacilityId) {
      return facilities.filter((f) => f.id === managerFacilityId);
    }
    return facilities;
  }, [facilities, managerFacilityId]);

  const defaultFacilityId = availableFacilities[0]?.id ?? item.breakdown[0]?.facilityId ?? '';

  const [facilityId, setFacilityId] = useState(defaultFacilityId);
  const [mode, setMode] = useState<StockAdjustmentMode>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setFacilityId(defaultFacilityId);
    setMode('add');
    setQuantity('');
    setReason('');
  }, [item.id, defaultFacilityId]);

  const currentStock = useMemo(() => {
    const breakdown = item.breakdown.find((b: InventoryBreakdown) => b.facilityId === facilityId);
    return breakdown?.stock ?? 0;
  }, [item.breakdown, facilityId]);

  const previewQuantity = useMemo(() => {
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    if (mode === 'set') return parsed;
    if (mode === 'add') return currentStock + parsed;
    return Math.max(0, currentStock - parsed);
  }, [quantity, mode, currentStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(quantity);
    if (!facilityId || !Number.isFinite(parsed) || parsed < 0) return;
    if (mode !== 'set' && parsed <= 0) return;

    await onSubmit({
      productId: item.id,
      facilityId,
      mode,
      quantity: parsed,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-border/40 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-border/60 bg-white px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="inventory" className="text-primary text-[24px]" />
            <div>
              <h3 className="text-headline-md font-bold text-on-surface">Điều chỉnh tồn kho</h3>
              <p className="text-body-sm text-secondary line-clamp-1">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-xs text-secondary hover:bg-slate-100 transition-all"
            type="button"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-lg p-lg">
          <div className="rounded-xl border border-slate-border/60 bg-surface-container-low/40 p-md">
            <p className="text-label-xs uppercase text-secondary">SKU</p>
            <p className="text-body-md font-mono text-on-surface">{item.sku}</p>
          </div>

          <div className="space-y-xs">
            <label htmlFor="adjust-facility" className="text-label-md font-semibold text-on-surface">
              Cơ sở
            </label>
            <select
              id="adjust-facility"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              disabled={availableFacilities.length <= 1}
              className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-70"
            >
              {availableFacilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
            <p className="text-body-sm text-secondary">
              Tồn kho hiện tại: <span className="font-semibold text-on-surface">{currentStock}</span>
            </p>
          </div>

          <div className="space-y-xs">
            <p className="text-label-md font-semibold text-on-surface">Loại điều chỉnh</p>
            <div className="space-y-sm">
              {MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-sm rounded-xl border p-md transition-colors ${
                    mode === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-border/60 hover:border-slate-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjust-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-body-sm font-semibold text-on-surface">{option.label}</span>
                    <span className="block text-body-xs text-secondary">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-xs">
            <label htmlFor="adjust-quantity" className="text-label-md font-semibold text-on-surface">
              {mode === 'set' ? 'Số lượng sau kiểm kê' : 'Số lượng điều chỉnh'}
            </label>
            <input
              id="adjust-quantity"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={mode === 'set' ? 'VD: 120' : 'VD: 10'}
              className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {previewQuantity !== null && (
              <p className="text-body-sm text-secondary">
                Tồn kho sau điều chỉnh:{' '}
                <span className="font-semibold text-primary">{previewQuantity}</span>
              </p>
            )}
          </div>

          <div className="space-y-xs">
            <label htmlFor="adjust-reason" className="text-label-md font-semibold text-on-surface">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Lý do điều chỉnh: nhập hàng, kiểm kê, sửa sai lệch..."
              className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-sm border-t border-slate-border/60 pt-lg">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-border px-md py-sm text-body-sm font-semibold text-secondary hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !facilityId || !quantity || Number(quantity) < 0 || (mode !== 'set' && Number(quantity) <= 0)}
              className="rounded-xl bg-primary px-md py-sm text-body-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStockModal;
