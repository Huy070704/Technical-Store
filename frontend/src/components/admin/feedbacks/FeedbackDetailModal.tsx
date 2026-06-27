import { useEffect, useState } from 'react';
import type { Feedback } from '@/services/feedbackService';
import MaterialIcon from '../shared/MaterialIcon';
import { formatDateTime } from '@/utils/dateFormatter';

type FeedbackDetailModalProps = {
  feedback: Feedback | null;
  loading?: boolean;
  saving?: boolean;
  onClose: () => void;
  onReply: (content: string) => Promise<void>;
};

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <MaterialIcon
      key={i}
      name={i < rating ? 'star' : 'star_border'}
      className={`text-[18px] ${i < rating ? 'text-amber-400' : 'text-slate-300'}`}
      filled={i < rating}
    />
  ));

const FeedbackDetailModal = ({
  feedback,
  loading,
  saving,
  onClose,
  onReply,
}: FeedbackDetailModalProps) => {
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    setReplyContent(feedback?.managerContent ?? '');
  }, [feedback]);

  if (!feedback && !loading) return null;

  const customerName =
    feedback?.customer?.name ||
    feedback?.customer?.email ||
    feedback?.customer?.username ||
    '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(replyContent.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-border/40 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-border/60 bg-white px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="rate_review" className="text-primary text-[24px]" />
            <h3 className="text-headline-md font-bold text-on-surface">Chi tiết Feedback</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-xs text-secondary hover:bg-slate-100 transition-all"
            type="button"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        {loading ? (
          <div className="p-xl text-center text-secondary">Đang tải chi tiết...</div>
        ) : feedback ? (
          <div className="space-y-lg p-lg">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div>
                <p className="text-label-xs uppercase text-secondary">Khách hàng</p>
                <p className="text-body-md font-medium text-on-surface">{customerName}</p>
                <p className="text-body-sm text-secondary">{feedback.customer?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-label-xs uppercase text-secondary">Sản phẩm</p>
                <p className="text-body-md font-medium text-on-surface">{feedback.product?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-label-xs uppercase text-secondary">Thời gian</p>
                <p className="text-body-md text-on-surface">{formatDateTime(feedback.createdAt)}</p>
              </div>
              <div>
                <p className="text-label-xs uppercase text-secondary">Đánh giá</p>
                <div className="mt-1 flex items-center gap-1">{renderStars(feedback.rating)}</div>
              </div>
            </div>

            <div>
              <p className="text-label-xs uppercase text-secondary mb-xs">Nội dung khách hàng</p>
              <p className="rounded-xl border border-slate-border/60 bg-surface-container-low/50 p-md text-body-sm leading-relaxed text-on-surface">
                {feedback.customerContent}
              </p>
            </div>

            {feedback.images && feedback.images.length > 0 && (
              <div>
                <p className="text-label-xs uppercase text-secondary mb-xs">Hình ảnh</p>
                <div className="flex flex-wrap gap-sm">
                  {feedback.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt="Feedback"
                      className="h-20 w-20 rounded-lg border border-slate-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-sm border-t border-slate-border/60 pt-lg">
              <label htmlFor="manager-reply" className="text-label-md font-semibold text-on-surface">
                Phản hồi của Manager
              </label>
              <textarea
                id="manager-reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Nhập phản hồi cho khách hàng..."
                className="w-full rounded-xl border border-slate-border/80 bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {feedback.managerContent && feedback.manager?.name && (
                <p className="text-body-sm text-secondary">
                  Phản hồi bởi {feedback.manager.name}
                </p>
              )}
              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-border px-md py-sm text-body-sm font-semibold text-secondary hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={saving || !replyContent.trim()}
                  className="rounded-xl bg-primary px-md py-sm text-body-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FeedbackDetailModal;
