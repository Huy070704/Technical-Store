const focusInput =
  'focus:border-primary focus:bg-bg-card focus:outline-none focus:ring-[3px] focus:ring-primary/10';

const disabledBtn =
  'disabled:cursor-not-allowed disabled:opacity-50';

export const ds = {
  typo: {
    headlineXl: 'font-inter text-headline-xl text-on-surface',
    headlineXlMobile: 'font-inter text-headline-xl-mobile text-on-surface',
    headlineLg: 'font-inter text-headline-lg text-on-surface',
    bodyMd: 'font-inter text-body-md text-on-surface',
    bodySm: 'font-inter text-body-sm text-on-surface',
    bodySmMuted: 'font-inter text-body-sm text-secondary',
    labelMd: 'font-inter text-label-md text-on-surface',
    labelXs: 'font-inter text-label-xs text-secondary',
    price: 'font-inter text-body-md font-semibold text-primary tabular-nums',
  },

  layout: {
    pageShell:
      'flex min-h-screen w-full flex-col overflow-x-hidden bg-bg-base',
    pageWithHeader: 'min-h-screen bg-bg-base pb-5 pt-[95px]',
    container: 'mx-auto w-full max-w-page px-md md:px-lg',
    containerWide: 'mx-auto w-full max-w-[1440px] px-md md:px-xl',
    sectionGap: 'flex flex-col gap-lg',
    sectionHeader:
      'mb-lg flex items-center gap-md border-b border-slate-border pb-md',
  },

  shadow: {
    card: 'shadow-card',
    elevated: 'shadow-elevated',
    primaryGlow: 'shadow-primary-glow',
  },

  card: {
    base: 'rounded-md border border-slate-border bg-bg-card shadow-card',
    elevated:
      'rounded-md border border-slate-border bg-bg-card shadow-elevated',
    paddingLg: 'p-lg',
    paddingMd: 'p-md',
    interactive:
      'transition-all duration-200 hover:border-primary/25 hover:shadow-elevated',
    stickySidebar: 'sticky top-5 h-fit lg:static',
  },

  btn: {
    primary: `inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border-none bg-primary px-md py-3 text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-hover ${disabledBtn}`,
    primaryFull: `mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border-none bg-primary px-4 py-4 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-bg-soft`,
    secondary: `inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-slate-border bg-bg-card px-md py-3 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-low ${disabledBtn}`,
    ghost: `inline-flex cursor-pointer items-center justify-center rounded-sm border-none bg-transparent px-3 py-2 text-body-sm font-medium text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface ${disabledBtn}`,
    icon: `flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm text-secondary transition-colors hover:bg-error/10 hover:text-error ${disabledBtn}`,
  },

  input: {
    group: 'mb-md flex flex-col gap-1',
    label: 'block text-label-md text-on-surface',
    field: `w-full rounded-sm border-2 border-slate-border bg-bg-card px-4 py-3 text-body-sm text-on-surface transition-all placeholder:text-secondary hover:border-outline-variant ${focusInput}`,
    hint: 'mt-1 block text-label-xs italic text-secondary',
    error: 'mt-1 block text-body-sm text-error',
    row: 'grid grid-cols-1 gap-md md:grid-cols-2',
  },

  badge: {
    sale: 'inline-flex rounded-full bg-primary-light px-2.5 py-0.5 text-label-xs font-semibold text-primary',
    success:
      'inline-flex rounded-full bg-tertiary/10 px-2 py-0.5 text-label-xs font-medium text-tertiary',
    warning:
      'inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-label-xs font-medium text-warning',
    error:
      'inline-flex rounded-full bg-error-container px-2 py-0.5 text-label-xs font-medium text-error',
    stockIn: 'rounded-sm bg-tertiary/10 px-1.5 py-0.5 text-label-xs font-medium text-tertiary',
    stockOut: 'rounded-sm bg-error-container px-1.5 py-0.5 text-label-xs font-medium text-error',
  },

  alert: {
    base: 'mb-md flex items-start justify-between gap-3 rounded-md border p-4 text-body-sm',
    success: 'border-tertiary/30 bg-tertiary/5 text-tertiary',
    warning: 'border-warning/40 bg-warning/10 text-warning',
    error: 'border-error/30 bg-error-container text-error',
    close:
      'shrink-0 cursor-pointer rounded border-none bg-transparent text-xl leading-none opacity-60 hover:opacity-100',
  },

  state: {
    loadingWrap: 'loading-grid-bg flex min-h-screen items-center justify-center',
    loadingInline: 'flex items-center justify-center py-xl',
    loadingInner: 'text-center',
    loadingSpinner: '',
    emptyWrap:
      'flex min-h-screen flex-col items-center justify-center bg-bg-base p-lg text-center',
    emptyCard:
      'mx-auto max-w-md rounded-lg bg-gradient-to-br from-bg-card to-bg-base px-xl py-12 text-center shadow-card',
  },

  nav: {
    bar: 'bg-inverse-surface text-inverse-on-surface shadow-sm',
    link: 'text-inverse-on-surface/80 transition-colors hover:text-inverse-on-surface',
    linkActive: 'text-inverse-on-surface font-semibold',
  },

  table: {
    wrap: 'overflow-hidden rounded-md border border-slate-border bg-bg-card shadow-card',
    header: 'bg-surface-container-low text-label-md text-secondary',
    row: 'border-b border-slate-border last:border-b-0',
    rowZebra: 'even:bg-bg-soft',
    cell: 'px-md py-3 text-body-sm text-on-surface',
  },

  control: {
    checkbox:
      'h-[18px] w-[18px] cursor-pointer rounded-sm accent-primary transition-transform hover:scale-105',
    qtyBtn:
      'flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-slate-border bg-bg-card text-on-surface transition-all hover:border-primary hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40',
  },

  summary: {
    row: 'mb-3 flex justify-between text-body-sm text-secondary',
    total:
      'mt-4 mb-4 flex justify-between border-t border-slate-border pt-4 text-body-md font-semibold text-on-surface',
  },
} as const;

export type DesignSystem = typeof ds;
