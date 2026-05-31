import { useEffect, type ReactNode } from 'react';
import { images } from '@/config/images';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    document.documentElement.classList.add('auth-page-active');
    document.body.classList.add('auth-page-active');
    return () => {
      document.documentElement.classList.remove('auth-page-active');
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  return (
    <div
      className="box-border flex h-[100dvh] max-h-[100dvh] w-full items-center justify-center overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${images.glow})` }}
    >
      {children}
    </div>
  );
};
