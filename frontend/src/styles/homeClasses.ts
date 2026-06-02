import { ds } from './designSystem';

export const home = {
  main: 'min-h-screen bg-bg-base pt-[95px]',
  content: 'w-full px-3 py-4 md:px-4 md:pb-[10px] md:pt-lg',
  loading: `${ds.state.loadingInline} min-h-[60vh]`,

  toast: {
    base: 'fixed right-4 top-[95px] z-50 rounded-xl px-5 py-3 text-sm font-semibold text-on-primary shadow-elevated transition-all',
    success: 'bg-tertiary',
    error: 'bg-primary',
    payment:
      'fixed left-1/2 top-[95px] z-50 w-[90%] max-w-md -translate-x-1/2 rounded-xl bg-tertiary px-6 py-4 text-center text-on-primary shadow-elevated',
    paymentClose:
      'cursor-pointer border-none bg-transparent text-xs text-inverse-on-surface/80 transition-colors hover:text-inverse-on-surface',
  },

  section: 'mb-xl',
  sectionHeaderRow: 'mb-lg flex items-center justify-between',
  sectionHeaderWithRule: 'mb-lg flex items-center gap-md',
  sectionTitle: `${ds.typo.headlineLg} font-semibold`,
  sectionRule: 'h-[2px] flex-1 rounded-full bg-outline-variant',
  linkMore:
    'flex cursor-pointer items-center gap-xs border-none bg-transparent text-sm font-semibold text-primary hover:underline',

  hero: {
    banner: `group relative mb-xl h-[300px] overflow-hidden rounded-display shadow-elevated md:h-[450px] lg:h-[500px]`,
    slide: 'absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-700',
    overlay:
      'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6 pb-[60px] md:p-xl',
    content: 'ml-[50px] flex max-w-2xl flex-wrap text-right',
    chip: 'mb-md inline-block rounded-full bg-white/20 px-4 py-1.5 text-label-xs font-bold text-inverse-on-surface backdrop-blur-md',
    title:
      'mb-md text-left text-2xl font-bold leading-tight text-inverse-on-surface md:text-4xl lg:text-5xl',
    subtitle:
      'mb-xl hidden max-w-lg text-left text-body-md text-inverse-on-surface/80 md:block',
    cta: `${ds.btn.primary} rounded-full px-8 py-3 text-base shadow-lg hover:shadow-primary-glow md:px-10 md:py-4 md:text-lg`,
    arrow:
      'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-inverse-on-surface shadow-lg backdrop-blur-md transition-all hover:bg-primary group-hover:opacity-100 md:h-12 md:w-12 opacity-0',
    arrowVisible: 'opacity-100',
    dots: 'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-6',
    dot: 'h-2 cursor-pointer rounded-full border-none transition-all',
    dotActive: 'w-8 bg-primary',
    dotInactive: 'w-2 bg-white/40 hover:bg-white/60',
  },

  category: {
    grid: 'grid grid-cols-2 gap-md md:grid-cols-4 lg:grid-cols-8',
    card: `${ds.card.base} ${ds.card.interactive} flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-sm rounded-xl p-lg`,
    iconWrap:
      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-low transition-colors group-hover:bg-primary-light',
    icon: 'material-symbols-outlined text-2xl leading-none text-primary',
    label: `flex w-full items-center justify-center text-center ${ds.typo.labelMd} leading-tight`,
  },

  featured: {
    heroCard:
      'col-span-12 flex flex-col justify-between overflow-hidden rounded-xl border border-slate-border bg-bg-card shadow-card lg:col-span-6',
    heroImageWrap:
      'relative flex min-h-[300px] cursor-pointer items-center justify-center overflow-hidden p-6',
    heroImage:
      'max-h-[250px] w-full object-contain transition-transform duration-500 hover:scale-105',
    hotBadge:
      'absolute left-6 top-6 rounded-sm bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-on-primary',
    heroBody:
      'flex flex-1 flex-col justify-between border-t border-slate-border p-8',
    heroName: `${ds.typo.headlineLg} mb-2 cursor-pointer font-bold transition-colors hover:text-primary`,
    heroDetailLink:
      'mb-4 cursor-pointer border-none bg-transparent p-0 text-body-sm font-medium text-primary hover:underline',
    heroDesc: `mb-6 line-clamp-2 ${ds.typo.bodySmMuted}`,
    heroPriceOld: `mb-0.5 text-sm line-through ${ds.typo.bodySmMuted}`,
    heroPrice: 'text-headline-xl font-bold leading-none text-primary',
    heroAddBtn:
      'flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-primary p-4 text-on-primary shadow-lg transition-all hover:bg-primary-hover',
    gridCell: 'col-span-6 lg:col-span-3',
  },

  productGrid: 'grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',

  promo: {
    grid: 'mb-xl grid grid-cols-1 gap-lg md:grid-cols-3',
    card: 'flex items-center gap-lg rounded-xl border border-outline-variant bg-surface-container p-lg shadow-card',
    iconWrap: 'shrink-0 rounded-full bg-bg-card p-md',
    icon: 'material-symbols-outlined text-3xl text-primary',
    title: ds.typo.labelMd,
    desc: ds.typo.labelXs,
  },
};
