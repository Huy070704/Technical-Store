import { LoadingIndicator } from './LoadingIndicator';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export const PageLoader = ({
  label = 'Đang tải trang...',
  fullScreen = true,
}: PageLoaderProps) => (
  <div
    className={
      fullScreen
        ? 'loading-grid-bg flex min-h-screen items-center justify-center'
        : 'flex items-center justify-center py-xl'
    }
  >
    <LoadingIndicator
      label={label}
      variant={fullScreen ? 'page' : 'section'}
    />
  </div>
);
