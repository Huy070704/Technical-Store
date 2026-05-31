import type { ReactNode } from 'react';
import { images } from '@/config/images';

interface FormCardProps {
  children: ReactNode;
}

export const FormCard = ({ children }: FormCardProps) => (
  <div className="box-border flex min-h-0 max-h-full w-full flex-1 items-center justify-center p-[clamp(0.75rem,2vh,1.5rem)] max-md:p-3">
    <div className="animate-slideIn flex h-[min(620px,calc(100dvh-2rem))] min-h-[560px] w-full max-w-[900px] overflow-hidden rounded-3xl border border-primary/10 bg-surface-container/80 shadow-[0_25px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl max-md:h-auto max-md:min-h-0 max-md:max-h-[calc(100dvh-1rem)] max-md:max-w-full max-md:flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-inverse-surface/95 px-[clamp(1.25rem,2.5vh,2rem)] py-10 max-md:px-8 max-md:py-8 max-[480px]:px-6 max-[480px]:py-6">
        <div className="mx-auto w-full max-w-[360px] shrink-0">{children}</div>
      </div>
      <div className="relative min-h-[280px] flex-1 overflow-hidden max-md:order-first max-md:min-h-0 max-md:h-[200px] max-[480px]:h-[150px]">
        <img
          src={images.pexels}
          alt="Linh kiện PC cao cấp"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent p-8 text-on-primary max-md:p-4">
          <h3 className="mb-2 text-2xl font-semibold max-md:text-xl">
            Linh kiện PC chất lượng
          </h3>
          <p className="text-base opacity-90 max-md:text-sm">
            Xây dựng cấu hình mơ ước với phụ kiện chính hãng
          </p>
        </div>
      </div>
    </div>
  </div>
);
