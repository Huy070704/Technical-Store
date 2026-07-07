import MaterialIcon from '@/components/admin/shared/MaterialIcon';

type StaffPaginationProps = {
  /** Trang hiện tại (bắt đầu từ 1). */
  current: number;
  /** Tổng số trang. */
  totalPages: number;
  /** Callback khi chuyển trang. */
  onChange: (page: number) => void;
  /** Nhãn tổng số mục hiển thị bên trái (tùy chọn), vd "Tổng 128 đơn". */
  totalLabel?: string;
};

/**
 * Thanh phân trang dùng chung cho các trang của nhân viên.
 * Hiển thị số trang dạng cửa sổ (1 … 4 5 6 … 20) kèm nút Trước/Sau.
 */
const StaffPagination = ({ current, totalPages, onChange, totalLabel }: StaffPaginationProps) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex flex-col gap-sm border-t border-slate-border/50 px-lg py-md sm:flex-row sm:items-center sm:justify-between">
      <span className="text-label-xs text-secondary">
        {totalLabel ? `${totalLabel} · ` : ''}Trang {current}/{totalPages}
      </span>
      <div className="flex items-center justify-center gap-xs">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang trước"
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
        </button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-xs text-secondary">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p as number)}
              className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-xs text-label-sm transition-colors ${
                current === p
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-slate-border/60 text-secondary hover:border-primary/40 hover:text-primary'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={current === totalPages}
          onClick={() => onChange(current + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang sau"
        >
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
};

export default StaffPagination;
