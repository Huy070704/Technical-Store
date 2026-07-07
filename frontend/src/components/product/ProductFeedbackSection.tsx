import React, { useEffect, useMemo, useState } from "react";
import { feedbackService, type Feedback } from "@/services/feedbackService";
import { formatDateTime as formatDate } from "@/utils/dateFormatter";
import { MessageSquare, Star } from "lucide-react";
import { FeedbackListSkeleton } from "@/components/shared";

interface ProductFeedbackSectionProps {
  productId: string;
  className?: string;
}

const ProductFeedbackSection: React.FC<ProductFeedbackSectionProps> = ({
  productId,
  className = "",
}) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1' | 'images' | 'replied'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await feedbackService.getFeedbacksByProduct(productId);
        if (!cancelled) setFeedbacks(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFeedbacks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (productId) {
      setActiveFilter('all');
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const filterCounts = useMemo(() => {
    return {
      all: feedbacks.length,
      r5: feedbacks.filter((fb) => fb.rating === 5).length,
      r4: feedbacks.filter((fb) => fb.rating === 4).length,
      r3: feedbacks.filter((fb) => fb.rating === 3).length,
      r2: feedbacks.filter((fb) => fb.rating === 2).length,
      r1: feedbacks.filter((fb) => fb.rating === 1).length,
      images: feedbacks.filter((fb) => fb.images && fb.images.length > 0).length,
      replied: feedbacks.filter((fb) => fb.managerContent && fb.managerContent.trim() !== '').length,
    };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'images') return fb.images && fb.images.length > 0;
      if (activeFilter === 'replied') return fb.managerContent && fb.managerContent.trim() !== '';
      return fb.rating === Number(activeFilter);
    });
  }, [feedbacks, activeFilter]);

  return (
    <section className={`rounded-2xl border border-slate-border bg-bg-card p-6 md:p-8 ${className}`}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-headline-lg text-on-surface">Đánh giá khách hàng</h2>
          <p className="text-body-sm text-secondary">
            {loading ? "Đang tải..." : `${feedbacks.length} nhận xét`}
          </p>
        </div>
      </div>

      {feedbacks.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-border/50 pb-4 justify-start">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'border border-slate-border bg-bg-card text-secondary hover:bg-surface-container-low'
            }`}
          >
            Tất cả ({filterCounts.all})
          </button>
          {[5, 4, 3, 2, 1].map((star) => {
            const countKey = `r${star}` as keyof typeof filterCounts;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setActiveFilter(String(star) as any)}
                className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
                  activeFilter === String(star)
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-slate-border bg-bg-card text-secondary hover:bg-surface-container-low'
                }`}
              >
                {star} ★ ({filterCounts[countKey]})
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveFilter('images')}
            className={`rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
              activeFilter === 'images'
                ? 'bg-primary text-white shadow-sm'
                : 'border border-slate-border bg-bg-card text-secondary hover:bg-surface-container-low'
            }`}
          >
            Có hình ảnh ({filterCounts.images})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('replied')}
            className={`rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
              activeFilter === 'replied'
                ? 'bg-primary text-white shadow-sm'
                : 'border border-slate-border bg-bg-card text-secondary hover:bg-surface-container-low'
            }`}
          >
            Cửa hàng phản hồi ({filterCounts.replied})
          </button>
        </div>
      )}

      {loading ? (
        <FeedbackListSkeleton />
      ) : feedbacks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-border bg-surface-container-low px-6 py-10 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-secondary/50" />
          <p className="text-body-md text-secondary">Chưa có đánh giá nào cho sản phẩm này.</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-border bg-surface-container-low px-6 py-10 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-secondary/50" />
          <p className="text-body-md text-secondary">Không tìm thấy đánh giá phù hợp bộ lọc.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredFeedbacks.map((fb) => (
            <li
              key={fb.id}
              className="rounded-xl border border-slate-border bg-surface-container-low/50 p-4 transition-colors hover:border-primary/20"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-on-surface">
                  {fb.customer?.name || fb.customer?.email || fb.customer?.username}
                </span>
                <time className="text-label-xs text-secondary">{formatDate(fb.createdAt)}</time>
              </div>
              {typeof fb.rating === "number" && (
                <div className="mb-2 flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < fb.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>
              )}
              <p className="text-body-sm leading-relaxed text-on-surface/90 text-left">{fb.customerContent}</p>
              {fb.images && fb.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {fb.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt="Ảnh đánh giá"
                      className="h-16 w-16 rounded-lg border border-slate-border object-cover"
                    />
                  ))}
                </div>
              )}
              {fb.managerContent && (
                <div className="mt-3 rounded-lg bg-surface-container-low p-3 border-l-2 border-primary/40 text-left">
                  <p className="text-label-xs font-semibold text-primary mb-1">
                    Cửa hàng phản hồi {fb.manager?.name ? `(${fb.manager.name})` : ''}:
                  </p>
                  <p className="text-body-sm text-on-surface/80 leading-relaxed">
                    {fb.managerContent}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ProductFeedbackSection;
