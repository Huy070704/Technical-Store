import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { feedbackService } from '@/services/feedbackService';
import type { Feedback } from '@/services/feedbackService';
import { LoadingIndicator } from '@/components/shared';

export const MyFeedbacksPage = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const data = await feedbackService.getMyFeedbacks();
        setFeedbacks(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải danh sách phản hồi');
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProductImage = (fb: Feedback) => {
    // Attempt to safely extract product image
    const product = fb.product as any;
    if (product?.images?.[0]?.url) return product.images[0].url;
    return undefined; // fallback to icon
  };

  const getProductName = (fb: Feedback) => {
    const product = fb.product as any;
    return product?.name || 'Sản phẩm';
  };

  if (loading) {
    return (
      <main className="pt-[95px] min-h-screen bg-bg-base flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <LoadingIndicator label="Đang tải danh sách phản hồi..." />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="pt-[95px] min-h-screen bg-bg-base flex flex-col">
      <div className="w-full max-w-page mx-auto px-4 py-8 flex-1">
        
        {/* Tiêu đề */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="w-1 h-6 bg-primary rounded-full" />
          <h3 className="text-headline-lg text-on-surface font-bold">Phản hồi của tôi</h3>
          <div className="h-[2px] flex-1 bg-slate-200 rounded-full"></div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {feedbacks.length === 0 && !error ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500 border border-slate-100">
            Bạn chưa có phản hồi nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {feedbacks.map((fb) => (
              <div 
                key={fb.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-5 group"
              >
                {/* Product Image Area */}
                <Link 
                  to={`/product/${fb.product?.slug || fb.product?.id}#feedbacks`}
                  className="w-full sm:w-[110px] sm:h-[110px] shrink-0 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:border-primary/20 transition-colors relative block cursor-pointer"
                >
                  {getProductImage(fb) ? (
                    <img 
                      src={getProductImage(fb)} 
                      alt={getProductName(fb)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-4xl">
                      inventory_2
                    </span>
                  )}
                  {/* Rating Badge on Image (Mobile only) */}
                  <div className="absolute bottom-2 left-2 sm:hidden bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <span className="text-amber-500 text-[12px] font-bold">{fb.rating}</span>
                    <span className="material-symbols-outlined text-amber-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                </Link>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 pt-1">
                  <div className="flex justify-between items-start mb-1 gap-2">
                     <Link 
                       to={`/product/${fb.product?.slug || fb.product?.id}#feedbacks`}
                       className="text-body-md font-bold text-slate-800 line-clamp-2 leading-tight hover:text-primary transition-colors cursor-pointer block"
                     >
                       {getProductName(fb)}
                     </Link>
                  </div>
                  
                  {/* Rating & Date (Desktop) */}
                  <div className="hidden sm:flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`material-symbols-outlined text-[16px] ${star <= fb.rating ? 'text-amber-400' : 'text-slate-200'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <span className="text-[12px] text-slate-500 font-medium tracking-wide uppercase">
                      {formatDate(fb.createdAt)}
                    </span>
                  </div>
                  
                  {/* Date (Mobile) */}
                  <div className="sm:hidden mb-2">
                    <span className="text-[12px] text-slate-500 font-medium tracking-wide uppercase">
                      {formatDate(fb.createdAt)}
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-[14px] text-slate-600 leading-relaxed line-clamp-3 italic">
                    "{fb.customerContent}"
                  </p>

                  {/* Manager Reply Snippet */}
                  {fb.managerContent && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2.5 items-start">
                       <div className="w-6 h-6 shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                         <span className="material-symbols-outlined text-[13px] text-primary">
                           storefront
                         </span>
                       </div>
                       <div>
                         <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-0.5">Phản hồi từ cửa hàng</span>
                         <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">
                           {fb.managerContent}
                         </p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
};
