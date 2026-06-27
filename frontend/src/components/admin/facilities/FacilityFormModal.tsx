import { useState, useEffect } from 'react';
import type { Facility, UpdateFacilityPayload } from '@/services/facilityService';
import MaterialIcon from '../shared/MaterialIcon';

type FacilityFormModalProps = {
  facility: Facility | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateFacilityPayload) => void;
};

const FacilityFormModal = ({ facility, saving, onClose, onSubmit }: FacilityFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (facility) {
      setFormData({
        name: facility.name || '',
        address: facility.address || '',
        phone: facility.phone || '',
        email: facility.email || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
      });
    }
  }, [facility]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
    });
  };

  const isEdit = !!facility;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-bg-card shadow-xl border border-slate-border/50">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <h2 className="text-headline-sm font-bold text-on-surface">
            {isEdit ? 'Chỉnh sửa cơ sở' : 'Thêm cơ sở mới'}
          </h2>
          <button
            aria-label="Đóng"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-lg">
          <div className="space-y-md">
            <div>
              <label htmlFor="name" className="mb-xs block text-label-md font-semibold text-on-surface">
                Tên cơ sở <span className="text-error">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full rounded-lg border border-slate-border/80 bg-white px-md py-sm text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên cơ sở"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-xs block text-label-md font-semibold text-on-surface">
                Địa điểm
              </label>
              <input
                id="address"
                type="text"
                className="w-full rounded-lg border border-slate-border/80 bg-white px-md py-sm text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Nhập địa điểm"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="mb-xs block text-label-md font-semibold text-on-surface">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="tel"
                className="w-full rounded-lg border border-slate-border/80 bg-white px-md py-sm text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-xs block text-label-md font-semibold text-on-surface">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border border-slate-border/80 bg-white px-md py-sm text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Nhập email"
              />
            </div>
          </div>

          <div className="mt-xl flex items-center justify-end gap-sm border-t border-slate-border/50 pt-md">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-md py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-all hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Cập nhật' : 'Tạo mới'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacilityFormModal;
