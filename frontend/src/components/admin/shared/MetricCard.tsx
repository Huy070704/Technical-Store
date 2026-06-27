import type { ProductMetric } from '../types/admin';
import MaterialIcon from './MaterialIcon';

type MetricCardProps = {
  metric: ProductMetric;
};

const iconToneClasses: Record<ProductMetric['tone'], string> = {
  primary: 'bg-primary-light text-primary',
  secondary: 'bg-secondary-fixed text-secondary',
  success: 'bg-tertiary-fixed text-tertiary',
  neutral: 'bg-surface-container-highest text-on-surface',
};

const metaToneClasses = {
  success: 'text-tertiary',
  danger: 'text-error',
  neutral: 'text-on-surface-variant',
};

const MetricCard = ({ metric }: MetricCardProps) => {
  return (
    <article className="rounded-xl border border-slate-border/30 bg-bg-card p-lg shadow-sm transition-all duration-300 hover:border-primary/30 hover:-translate-y-[2px] hover:shadow-md">
      <div className="flex items-start justify-between gap-md">
        <MaterialIcon name={metric.icon} className={`rounded-lg p-sm ${iconToneClasses[metric.tone]}`} />
        <span className={`text-label-md ${metaToneClasses[metric.metaTone ?? 'neutral']}`}>{metric.meta}</span>
      </div>
      <div className="mt-md">
        <p className="text-label-xs tracking-wider uppercase text-secondary font-bold opacity-80">{metric.label}</p>
        <h3 className="text-headline-xl font-bold text-on-surface mt-1">{metric.value}</h3>
      </div>
    </article>
  );
};

export default MetricCard;
