import MaterialIcon from './MaterialIcon';

type PageHeaderProps = {
  title: string;
  description: string;
  actionLabel?: string; // optional
  actionIcon?: string;
  onActionClick?: () => void;
};

const PageHeader = ({
  title,
  description,
  actionLabel,
  actionIcon = 'add',
  onActionClick,
}: PageHeaderProps) => {
  return (
    <div className="flex flex-col justify-between gap-md md:flex-row md:items-center mb-md">
      <div>
        <h1 className="text-headline-xl font-bold text-on-surface tracking-tight">{title}</h1>
        <p className="text-body-md text-secondary max-w-[65ch] mt-1">{description}</p>
      </div>

      {actionLabel && (
        <button
          onClick={onActionClick}
          className="flex w-full items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-on-primary shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-md active:scale-[0.98] md:w-auto"
          type="button"
        >
          <MaterialIcon name={actionIcon} />
          <span className="text-label-md">{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default PageHeader;