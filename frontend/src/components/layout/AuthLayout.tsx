import { useEffect, type ReactNode } from 'react';

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
    <div className="box-border flex h-screen w-screen overflow-hidden bg-slate-950">
      {children}
    </div>
  );
};
