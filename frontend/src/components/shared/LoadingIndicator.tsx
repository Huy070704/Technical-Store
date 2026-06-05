import { ds } from '@/styles/designSystem';

type LoadingVariant = 'page' | 'section' | 'inline' | 'button';
type LoadingTone = 'brand' | 'light';

interface LoadingIndicatorProps {
  label?: string;
  variant?: LoadingVariant;
  tone?: LoadingTone;
  showLabel?: boolean;
  className?: string;
}

const sizeMap: Record<LoadingVariant, string> = {
  page: 'h-[72px] w-[72px]',
  section: 'h-14 w-14',
  inline: 'h-10 w-10',
  button: 'h-5 w-5',
};

const ringInsetMap: Record<LoadingVariant, { outer: string; mid: string; inner: string }> = {
  page: { outer: 'inset-0', mid: 'inset-[7px]', inner: 'inset-[14px]' },
  section: { outer: 'inset-0', mid: 'inset-[5px]', inner: 'inset-[10px]' },
  inline: { outer: 'inset-0', mid: 'inset-1', inner: 'inset-2' },
  button: { outer: 'inset-0', mid: 'inset-0.5', inner: 'inset-1' },
};

const coreSizeMap: Record<LoadingVariant, string> = {
  page: 'h-2.5 w-2.5',
  section: 'h-2 w-2',
  inline: 'h-1.5 w-1.5',
  button: 'h-1 w-1',
};

export const LoadingIndicator = ({
  label = 'Đang tải',
  variant = 'inline',
  tone = variant === 'button' ? 'light' : 'brand',
  showLabel = true,
  className = '',
}: LoadingIndicatorProps) => {
  const rings = ringInsetMap[variant];
  const isPage = variant === 'page';
  const isLight = tone === 'light';

  const ringIdle = isLight ? 'border-white/20' : 'border-primary/15';
  const ringFast = isLight
    ? 'border-t-white border-r-white/50'
    : 'border-t-primary border-r-primary/40';
  const ringSlow = isLight
    ? 'border-b-white/70 border-l-white/30'
    : 'border-b-primary/60 border-l-primary/25';
  const core = isLight ? 'bg-white' : 'bg-primary';
  const glow = isPage && !isLight ? 'drop-shadow-[0_0_18px_rgba(183,0,17,0.18)]' : '';
  const statusTone = isLight ? 'text-white/70' : 'text-primary/60';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={`relative ${sizeMap[variant]} ${glow}`} aria-hidden>
        <span
          className={`absolute ${rings.outer} rounded-full border loader-ring-breathe ${ringIdle}`}
        />
        <span
          className={`absolute ${rings.mid} rounded-full border-2 border-transparent loader-orbit-fast ${ringFast}`}
        />
        <span
          className={`absolute ${rings.inner} rounded-full border-2 border-transparent loader-orbit-slow ${ringSlow}`}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className={`rounded-full ${core} ${coreSizeMap[variant]} loader-core-pulse`} />
        </span>
      </div>

      {showLabel && variant !== 'button' && (
        <div className="flex flex-col items-center gap-1">
          <p className={`${ds.typo.bodySmMuted} font-medium tracking-wide`}>{label}</p>
          {isPage && (
            <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${statusTone}`}>
              Đồng bộ dữ liệu
            </p>
          )}
        </div>
      )}
    </div>
  );
};
