import { useCallback, useEffect, useState } from 'react';
import {
  AdminLayout,
  PageHeader,
  MetricCard,
  ConfirmModal,
} from '@/components/admin';
import FeedbackTable from '@/components/admin/feedbacks/FeedbackTable';
import FeedbackDetailModal from '@/components/admin/feedbacks/FeedbackDetailModal';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import { useToast } from '@/contexts/ToastContext';
import {
  feedbackService,
  type Feedback,
  type FeedbackStatistics,
} from '@/services/feedbackService';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const PAGE_SIZE = 10;

const AdminFeedbackManagement = () => {
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [statistics, setStatistics] = useState<FeedbackStatistics>({
    total: 0,
    visibleTotal: 0,
    hiddenCount: 0,
    repliedCount: 0,
    averageRating: 0,
    replyRate: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden' | 'replied' | 'unreplied'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replySaving, setReplySaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<'hide' | 'delete' | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Feedback | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, stats] = await Promise.all([
        feedbackService.getManagementFeedbacks({
          page,
          pageSize: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
          rating: ratingFilter !== 'all' ? Number(ratingFilter) : undefined,
          status: statusFilter,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        feedbackService.getStatistics(),
      ]);
      setFeedbacks(Array.isArray(listResult.data) ? listResult.data : []);
      setTotal(listResult.total ?? 0);
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
      setError('Không thể tải dữ liệu feedback. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, ratingFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleViewClick = async (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDetailLoading(true);
    try {
      const detail = await feedbackService.getFeedbackById(feedback.id);
      setSelectedFeedback(detail);
    } catch {
      toast.error('Không thể tải chi tiết feedback.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (content: string) => {
    if (!selectedFeedback) return;
    try {
      setReplySaving(true);
      const updated = await feedbackService.replyToFeedback(selectedFeedback.id, content);
      setSelectedFeedback(updated);
      setFeedbacks((prev) => prev.map((fb) => (fb.id === updated.id ? updated : fb)));
      toast.success('Đã gửi phản hồi thành công!');
      const stats = await feedbackService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError?.response?.data?.message ?? 'Gửi phản hồi thất bại.');
    } finally {
      setReplySaving(false);
    }
  };

  const handleHideToggle = (feedback: Feedback) => {
    setConfirmTarget(feedback);
    setConfirmAction('hide');
  };

  const handleDeleteClick = (feedback: Feedback) => {
    setConfirmTarget(feedback);
    setConfirmAction('delete');
  };

  const handleConfirm = async () => {
    if (!confirmTarget || !confirmAction) return;
    try {
      setConfirmLoading(true);
      if (confirmAction === 'hide') {
        const updated = await feedbackService.toggleHide(confirmTarget.id, !confirmTarget.isHidden);
        setFeedbacks((prev) => prev.map((fb) => (fb.id === updated.id ? updated : fb)));
        toast.success(updated.isHidden ? 'Đã ẩn feedback.' : 'Đã hiện feedback.');
      } else {
        await feedbackService.deleteFeedback(confirmTarget.id);
        setFeedbacks((prev) => prev.filter((fb) => fb.id !== confirmTarget.id));
        toast.success('Đã xóa feedback.');
      }
      const stats = await feedbackService.getStatistics();
      setStatistics(stats);
      setConfirmAction(null);
      setConfirmTarget(null);
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError?.response?.data?.message ?? 'Thao tác thất bại.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const metrics = [
    {
      label: 'Tổng feedback',
      value: statistics.total.toString(),
      icon: 'forum',
      tone: 'primary' as const,
      meta: `${statistics.visibleTotal} đang hiển thị`,
      metaTone: 'neutral' as const,
    },
    {
      label: 'Điểm trung bình',
      value: statistics.averageRating.toFixed(1),
      icon: 'star',
      tone: 'secondary' as const,
      meta: 'Trên 5 sao',
      metaTone: 'success' as const,
    },
    {
      label: 'Tỷ lệ phản hồi',
      value: `${statistics.replyRate}%`,
      icon: 'reply',
      tone: 'success' as const,
      meta: `${statistics.repliedCount} đã trả lời`,
      metaTone: 'success' as const,
    },
    {
      label: 'Đã ẩn',
      value: statistics.hiddenCount.toString(),
      icon: 'visibility_off',
      tone: 'neutral' as const,
      meta: 'Spam / vi phạm',
      metaTone: 'danger' as const,
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          description="Quản lý đánh giá khách hàng, phản hồi và ẩn nội dung không phù hợp."
          title="Quản Lý Feedback"
        />

        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {error && (
          <div className="rounded-lg bg-error-container p-4 text-error">{error}</div>
        )}

        <form
          onSubmit={handleSearch}
          className="w-full rounded-2xl border border-slate-border/30 bg-bg-card p-md shadow-sm transition-all duration-300"
        >
          <div className="flex flex-col gap-md lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative flex-1 min-w-[220px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
                <MaterialIcon name="search" className="text-[20px]" />
              </span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo nội dung..."
                className="w-full rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white py-sm pl-[44px] pr-md text-body-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-md">
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Tất cả sao</option>
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{r} sao</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="visible">Đang hiển thị</option>
                <option value="hidden">Đã ẩn</option>
                <option value="replied">Đã phản hồi</option>
                <option value="unreplied">Chưa phản hồi</option>
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="submit"
                className="rounded-xl bg-primary px-md py-sm text-body-sm font-semibold text-white transition-all duration-200 hover:bg-primary-hover shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Lọc
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <h2 className="text-headline-lg font-bold text-on-surface">Danh sách feedback</h2>
          <span className="text-body-sm text-secondary">{total} kết quả</span>
        </div>

        <FeedbackTable
          feedbacks={feedbacks}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={setPage}
          onViewClick={handleViewClick}
          onHideToggle={handleHideToggle}
          onDeleteClick={handleDeleteClick}
        />

        {selectedFeedback && (
          <FeedbackDetailModal
            feedback={selectedFeedback}
            loading={detailLoading}
            saving={replySaving}
            onClose={() => setSelectedFeedback(null)}
            onReply={handleReply}
          />
        )}

        {confirmAction && confirmTarget && (
          <ConfirmModal
            isOpen
            title={confirmAction === 'hide'
              ? (confirmTarget.isHidden ? 'Hiện feedback' : 'Ẩn feedback')
              : 'Xóa feedback'}
            message={confirmAction === 'hide'
              ? confirmTarget.isHidden
                ? 'Feedback này sẽ được hiển thị lại trên trang sản phẩm.'
                : 'Feedback này sẽ bị ẩn khỏi trang sản phẩm (spam/vi phạm).'
              : 'Feedback sẽ bị xóa mềm. Hành động này khó hoàn tác.'}
            confirmLabel={confirmAction === 'hide'
              ? (confirmTarget.isHidden ? 'Hiện' : 'Ẩn')
              : 'Xóa'}
            cancelLabel="Hủy"
            confirmTone={confirmAction === 'delete' ? 'error' : 'warning'}
            icon={confirmAction === 'delete' ? 'delete' : 'visibility_off'}
            loading={confirmLoading}
            onConfirm={handleConfirm}
            onCancel={() => {
              setConfirmAction(null);
              setConfirmTarget(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeedbackManagement;
