import type { ImgHTMLAttributes } from 'react';

export interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Ảnh above-the-fold (logo, slide đầu): tải ngay, không lazy.
   * Mặc định: lazy + decoding async.
   */
  eager?: boolean;
}

/**
 * Wrapper <img> với lazy loading chuẩn trình duyệt.
 * Dùng eager cho LCP (banner đầu, logo); lazy cho danh sách sản phẩm.
 */
export const LazyImage = ({
  eager = false,
  loading,
  decoding,
  fetchPriority,
  ...props
}: LazyImageProps) => (
  <img
    loading={loading ?? (eager ? 'eager' : 'lazy')}
    decoding={decoding ?? 'async'}
    fetchPriority={fetchPriority ?? (eager ? 'high' : undefined)}
    {...props}
  />
);
