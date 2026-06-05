interface ShimmerBlockProps {
  className?: string;
}

export const ShimmerBlock = ({ className = '' }: ShimmerBlockProps) => (
  <div className={`skeleton-shimmer rounded-md ${className}`} aria-hidden />
);

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export const ProductGridSkeleton = ({
  count = 10,
  className = '',
}: ProductGridSkeletonProps) => (
  <div
    className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${className}`}
    aria-hidden
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton-rise overflow-hidden rounded-xl border border-slate-border/60 bg-bg-card p-3"
        style={{ animationDelay: `${i * 55}ms` }}
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-lg">
          <ShimmerBlock className="h-full w-full rounded-lg" />
          <div className="loader-scan-line pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
        <ShimmerBlock className="mb-2 h-3 w-16" />
        <ShimmerBlock className="mb-2 h-4 w-full" />
        <ShimmerBlock className="mb-3 h-5 w-24" />
        <ShimmerBlock className="h-8 rounded-lg" />
      </div>
    ))}
  </div>
);

export const CartListSkeleton = ({ count = 2 }: { count?: number }) => (
  <div className="flex flex-col gap-6" aria-hidden>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton-rise overflow-hidden rounded-xl border border-slate-border/70 bg-bg-card"
        style={{ animationDelay: `${i * 80}ms` }}
      >
        <div className="flex">
          <ShimmerBlock className="hidden w-12 shrink-0 sm:block" />
          <div className="flex flex-1 flex-col gap-4 p-4 sm:grid sm:grid-cols-[140px_1fr] sm:p-5">
            <ShimmerBlock className="aspect-square w-full max-w-[140px] rounded-lg" />
            <div className="flex flex-col gap-3">
              <ShimmerBlock className="h-5 w-24 rounded-full" />
              <ShimmerBlock className="h-6 w-[80%]" />
              <div className="flex gap-4 border-t border-slate-border/40 pt-3">
                <ShimmerBlock className="h-10 w-24" />
                <ShimmerBlock className="h-10 w-20" />
              </div>
              <ShimmerBlock className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="mx-auto max-w-page px-4 pb-12 pt-[90px] md:px-6" aria-hidden>
    <ShimmerBlock className="mb-8 h-10 w-64 rounded-lg" />
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <div className="overflow-hidden rounded-2xl border border-slate-border/70 bg-bg-card p-4 sm:p-5">
        <ShimmerBlock className="mb-4 h-4 w-40" />
        <div className="grid gap-4 md:grid-cols-[72px_1fr]">
          <div className="hidden flex-col gap-2 md:flex">
            {[1, 2, 3, 4].map((n) => (
              <ShimmerBlock key={n} className="h-[72px] w-[72px] rounded-xl" />
            ))}
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-xl sm:min-h-[440px] md:min-h-[520px]">
            <ShimmerBlock className="h-full w-full rounded-xl" />
            <div className="loader-scan-line pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1.5 md:hidden">
          {[1, 2, 3].map((n) => (
            <ShimmerBlock key={n} className="h-16 w-16 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <ShimmerBlock className="h-6 w-28 rounded-full" />
        <ShimmerBlock className="h-10 w-full max-w-lg" />
        <ShimmerBlock className="h-12 w-40" />
        <ShimmerBlock className="h-24 w-full rounded-xl" />
        <div className="flex gap-3 pt-2">
          <ShimmerBlock className="h-12 flex-1 rounded-xl" />
          <ShimmerBlock className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export const FeedbackListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3" aria-hidden>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton-rise overflow-hidden rounded-xl border border-slate-border/50 p-4"
        style={{ animationDelay: `${i * 70}ms` }}
      >
        <div className="mb-3 flex justify-between gap-3">
          <ShimmerBlock className="h-4 w-32" />
          <ShimmerBlock className="h-3 w-20" />
        </div>
        <ShimmerBlock className="mb-2 h-3 w-full" />
        <ShimmerBlock className="h-3 w-[80%]" />
      </div>
    ))}
  </div>
);
