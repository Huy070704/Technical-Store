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
    <article className="rounded-xl border border-slate-border/50 bg-bg-card p-lg shadow-md transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-md">
        <MaterialIcon name={metric.icon} className={`rounded-lg p-sm ${iconToneClasses[metric.tone]}`} />
        <span className={`text-label-md ${metaToneClasses[metric.metaTone ?? 'neutral']}`}>{metric.meta}</span>
      </div>
      <div className="mt-md">
        <p className="text-label-md text-secondary">{metric.label}</p>
        <h3 className="text-headline-xl font-bold text-on-surface">{metric.value}</h3>
      </div>
    </article>
  );
};

export default MetricCard;
