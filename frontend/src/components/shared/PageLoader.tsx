import { ds } from '@/styles/designSystem';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export const PageLoader = ({
  label = 'Đang tải trang...',
  fullScreen = true,
}: PageLoaderProps) => (
  <div
    className={fullScreen ? ds.state.loadingWrap : ds.state.loadingInline}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className={ds.state.loadingInner}>
      <div className={ds.state.loadingSpinner} aria-hidden />
      <p className={`mt-2.5 ${ds.typo.bodySmMuted}`}>{label}</p>
    </div>
  </div>
);
