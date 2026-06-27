import React, { useEffect, useState } from "react";
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
    if (productId) load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

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

      {loading ? (
        <FeedbackListSkeleton />
      ) : feedbacks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-border bg-surface-container-low px-6 py-10 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-secondary/50" />
          <p className="text-body-md text-secondary">Chưa có đánh giá nào cho sản phẩm này.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {feedbacks.map((fb) => (
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
              <p className="text-body-sm leading-relaxed text-on-surface/90">{fb.customerContent}</p>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ProductFeedbackSection;
