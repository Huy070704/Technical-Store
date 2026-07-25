import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { images } from '@/config/images';

interface FormCardProps {
  children: ReactNode;
  /** Tiêu đề overlay trên ảnh (panel bên phải). */
  panelTitle?: ReactNode;
  /** Các "pill" ưu điểm hiển thị dưới ảnh. */
  pills?: string[];
  /** Badge live góc trên phải (vd: "1.240 sản phẩm sẵn kho"). Bỏ trống để ẩn. */
  badge?: string | null;
  /** Ảnh nền panel phải. */
  image?: string;
  /** Action khi bấm nút back góc trên trái. Mặc định về trang chủ. */
  onBack?: () => void;
}

const OVERLAY =
  'linear-gradient(to top,rgba(33,49,69,0.92) 0%,rgba(33,49,69,0.45) 38%,rgba(33,49,69,0.08) 65%,rgba(33,49,69,0.25) 100%)';

const DEFAULT_PILLS = [
  'Bảo hành 36 tháng',
  'Giao toàn quốc 48h',
  'Hỗ trợ 7 ngày/tuần',
];

export const FormCard = ({
  children,
  panelTitle = (
    <>
      Linh kiện PC chính hãng,
      <br />
      giá minh bạch
    </>
  ),
  pills = DEFAULT_PILLS,
  badge = '1.240 sản phẩm sẵn kho',
  image = images.pexels,
  onBack,
}: FormCardProps) => {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate('/'));

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-950 max-md:flex-col max-md:overflow-y-auto">
      {/* Nút về trang chủ ở góc trên bên trái */}
      <button
        type="button"
        onClick={handleBack}
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 border-none bg-transparent p-0 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-100 cursor-pointer md:left-8 md:top-8"
        aria-label="Về trang chủ"
      >
        <ArrowLeft size={16} />
        <span>Trang chủ</span>
      </button>

      {/* Panel form (trái - 50%) */}
      <div className="relative flex w-full md:w-1/2 flex-col justify-center overflow-y-auto bg-slate-900 px-10 md:px-14 lg:px-20 py-10 max-md:px-8 max-md:py-8 max-[480px]:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto w-full max-w-[460px]">{children}</div>
      </div>

    {/* Panel ảnh (phải - 50%) */}
    <div className="relative w-full md:w-1/2 overflow-hidden bg-inverse-surface max-md:order-first max-md:h-[220px] max-md:min-h-0">
      <img
        src={image}
        alt="Linh kiện PC"
        className="absolute inset-0 h-full w-full origin-center object-cover animate-kenburns"
      />
      <div className="absolute inset-0" style={{ background: OVERLAY }} />



      {/* Badge live */}
      {badge && (
        <div className="animate-fadeInUp absolute right-10 top-8 flex items-center gap-2 rounded-full bg-[rgba(33,49,69,0.75)] px-4 py-1.5 backdrop-blur-sm max-md:hidden">
          <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim animate-pulseDot" />
          <span className="text-xs font-medium text-inverse-on-surface">{badge}</span>
        </div>
      )}

      {/* Tiêu đề + pills */}
      <div className="absolute inset-x-12 bottom-12 flex flex-col gap-4 max-md:hidden">
        <h2 className="animate-fadeInUp m-0 text-3xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-4xl">
          {panelTitle}
        </h2>
        <div className="animate-fadeInUp flex flex-wrap gap-2.5">
          {pills.map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.14] px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
            >
              <Check size={14} strokeWidth={2.2} className="text-tertiary-fixed-dim" />
              {pill}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);
};
