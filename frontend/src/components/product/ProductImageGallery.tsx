import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { ProductImage } from '@/types/product';

const FALLBACK_IMAGE = '/img/pc.png';

interface ProductImageGalleryProps {
  images?: ProductImage[];
  productName: string;
  className?: string;
}

export const ProductImageGallery = ({
  images = [],
  productName,
  className = '',
}: ProductImageGalleryProps) => {
  const galleryImages = useMemo(() => {
    if (images.length > 0) return images;
    return [{ id: 'fallback', url: FALLBACK_IMAGE }];
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];
  const hasMultiple = galleryImages.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryImages]);

  useEffect(() => {
    setImageLoaded(false);
  }, [activeImage?.url]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= galleryImages.length) return;
      setActiveIndex(index);
    },
    [galleryImages.length],
  );

  const goPrev = useCallback(() => {
    goTo(activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1);
  }, [activeIndex, galleryImages.length, goTo]);

  const goNext = useCallback(() => {
    goTo(activeIndex === galleryImages.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, galleryImages.length, goTo]);

  useEffect(() => {
    if (!hasMultiple) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, hasMultiple]);

  const handleImageError = (e: SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <div
      className={`sticky top-24 overflow-hidden rounded-2xl border border-slate-border/80 bg-bg-card shadow-[0_16px_48px_rgba(11,28,48,0.06)] ${className}`}
    >
      <div className="absolute left-0 top-0 z-10 h-1 w-full bg-gradient-to-r from-primary via-primary-hover to-tertiary" />

      <div className="flex flex-col gap-4 p-4 sm:p-5 md:gap-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
            <Images className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
            Hình ảnh sản phẩm
          </div>
          {hasMultiple && (
            <span className="rounded-full border border-slate-border/70 bg-surface-container-low/80 px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums text-on-surface">
              {activeIndex + 1} / {galleryImages.length}
            </span>
          )}
        </div>

        <div className={`grid gap-4 ${hasMultiple ? 'md:grid-cols-[72px_1fr]' : ''}`}>
          {hasMultiple && (
            <div
              className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:pb-0 md:max-h-[560px] custom-scrollbar"
              role="tablist"
              aria-label="Ảnh sản phẩm"
            >
              {galleryImages.map((img, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={img.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Ảnh ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={`group relative shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? 'border-primary shadow-[0_0_0_3px_rgba(183,0,17,0.14)]'
                        : 'border-slate-border/70 hover:border-primary/35'
                    } h-[64px] w-[64px] md:h-[72px] md:w-[72px]`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className={`h-full w-full object-cover transition-transform duration-300 ${
                        isActive ? 'scale-100' : 'scale-95 group-hover:scale-100'
                      }`}
                      onError={handleImageError}
                    />
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative order-1 md:order-2">
            <div
              className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-slate-border/60 bg-[linear-gradient(rgba(203,213,225,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,0.32)_1px,transparent_1px)] bg-[size:18px_18px] bg-surface-container-low sm:min-h-[440px] md:min-h-[520px] lg:min-h-[560px]"
              role="tabpanel"
              aria-label={`Ảnh ${activeIndex + 1} — ${productName}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,255,255,0.85),transparent)]" />

              <img
                key={activeImage.url}
                src={activeImage.url}
                alt={`${productName} — ảnh ${activeIndex + 1}`}
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
                className={`relative z-[1] max-h-[320px] w-full object-contain p-6 transition-all duration-500 sm:max-h-[400px] md:max-h-[480px] lg:max-h-[520px] ${
                  imageLoaded ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
                }`}
              />

              {!imageLoaded && (
                <div className="absolute inset-0 z-[2] flex items-center justify-center">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-primary/15" />
                </div>
              )}

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Ảnh trước"
                    className="absolute left-3 top-1/2 z-[3] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-border/80 bg-bg-card/90 text-on-surface shadow-sm backdrop-blur-sm transition-all hover:border-primary hover:text-primary"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Ảnh sau"
                    className="absolute right-3 top-1/2 z-[3] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-border/80 bg-bg-card/90 text-on-surface shadow-sm backdrop-blur-sm transition-all hover:border-primary hover:text-primary"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </>
              )}
            </div>

            {hasMultiple && (
              <div className="mt-3 flex justify-center gap-1.5">
                {galleryImages.map((img, index) => (
                  <button
                    key={`dot-${img.id}`}
                    type="button"
                    aria-label={`Chuyển tới ảnh ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? 'w-6 bg-primary'
                        : 'w-1.5 bg-slate-border hover:bg-primary/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
