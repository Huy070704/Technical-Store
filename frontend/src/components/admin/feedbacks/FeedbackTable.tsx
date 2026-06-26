import type { Feedback } from '@/services/feedbackService';
import MaterialIcon from '../shared/MaterialIcon';
import { formatDateTime } from '@/utils/dateFormatter';

type FeedbackTableProps = {
  feedbacks: Feedback[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onViewClick: (feedback: Feedback) => void;
  onHideToggle: (feedback: Feedback) => void;
  onDeleteClick: (feedback: Feedback) => void;
};

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <MaterialIcon
      key={i}
      name={i < rating ? 'star' : 'star_border'}
      className={`text-[16px] ${i < rating ? 'text-amber-400' : 'text-slate-300'}`}
      filled={i < rating}
    />
  ));

const FeedbackTable = ({
  feedbacks,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onViewClick,
  onHideToggle,
  onDeleteClick,
}: FeedbackTableProps) => {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-border bg-bg-soft">
              {['Khách hàng', 'Sản phẩm', 'Đánh giá', 'Nội dung', 'Thời gian', 'Trạng thái', 'Hành động'].map(
                (header) => (
                  <th
                    key={header}
                    className={`px-lg py-md text-label-md uppercase text-secondary ${
                      header === 'Hành động' ? 'text-center' : ''
                    }`}
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border/30">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-lg py-xl text-center text-secondary">
                  Đang tải danh sách feedback...
                </td>
              </tr>
            ) : feedbacks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-lg py-xl text-center text-secondary">
                  Không tìm thấy feedback nào.
                </td>
              </tr>
            ) : (
              feedbacks.map((feedback) => {
                const customerName =
                  feedback.customer?.name ||
                  feedback.customer?.email ||
                  feedback.customer?.username ||
                  '—';
                const hasReply = Boolean(feedback.managerContent?.trim());
                const statusLabel = feedback.isHidden
                  ? 'Đã ẩn'
                  : hasReply
                    ? 'Đã phản hồi'
                    : 'Hiển thị';

                return (
                  <tr key={feedback.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-lg py-md">
                      <div className="text-label-md text-on-surface">{customerName}</div>
                      <div className="text-body-sm text-secondary">{feedback.customer?.email ?? '—'}</div>
                    </td>
                    <td className="px-lg py-md text-body-sm text-on-surface max-w-[180px] truncate">
                      {feedback.product?.name ?? '—'}
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-0.5">{renderStars(feedback.rating)}</div>
                    </td>
                    <td className="px-lg py-md text-body-sm text-on-surface max-w-[240px]">
                      <p className="line-clamp-2">{feedback.customerContent}</p>
                    </td>
                    <td className="px-lg py-md text-body-sm text-secondary whitespace-nowrap">
                      {formatDateTime(feedback.createdAt)}
                    </td>
                    <td className="px-lg py-md">
                      <span
                        className={`inline-flex rounded-full px-sm py-xs text-label-xs font-medium ${
                          feedback.isHidden
                            ? 'bg-error/10 text-error'
                            : hasReply
                              ? 'bg-success/10 text-success'
                              : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-lg py-md text-center">
                      <div className="flex items-center justify-center gap-x-xs">
                        <button
                          aria-label="Xem chi tiết"
                          className="rounded p-xs text-secondary transition-all hover:bg-bg-soft hover:text-on-surface"
                          type="button"
                          onClick={() => onViewClick(feedback)}
                        >
                          <MaterialIcon name="visibility" />
                        </button>
                        <button
                          aria-label={feedback.isHidden ? 'Hiện feedback' : 'Ẩn feedback'}
                          className="rounded p-xs text-secondary transition-all hover:bg-bg-soft hover:text-warning"
                          type="button"
                          onClick={() => onHideToggle(feedback)}
                        >
                          <MaterialIcon name={feedback.isHidden ? 'visibility' : 'visibility_off'} />
                        </button>
                        <button
                          aria-label="Xóa feedback"
                          className="rounded p-xs text-secondary transition-all hover:bg-bg-soft hover:text-error"
                          type="button"
                          onClick={() => onDeleteClick(feedback)}
                        >
                          <MaterialIcon name="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-border/50 px-lg py-md">
          <span className="text-body-sm text-secondary">
            Trang {page}/{totalPages} · {total} feedback
          </span>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-slate-border px-sm py-xs text-body-sm disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-slate-border px-sm py-xs text-body-sm disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeedbackTable;
