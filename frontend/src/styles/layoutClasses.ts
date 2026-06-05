import { ds } from './designSystem';

export const layout = {
  header: {
    root: `fixed top-0 z-40 h-[95px] w-full border-b border-slate-border bg-bg-card ${ds.shadow.card}`,
    inner:
      'flex h-full w-full items-center gap-4 pl-[30px] pr-4 md:gap-6 md:pr-8 lg:pr-12 xl:pr-16',
    logo: 'mr-[60px] h-[80px] w-[200px] object-contain',
    searchWrap: 'hidden min-w-0 flex-1 justify-center px-2 md:flex lg:px-8',
    searchBox: 'relative w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl',
    searchIcon:
      'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-secondary',
    searchInput:
      'w-full rounded-full border-none bg-surface-container-low py-3 pl-12 pr-5 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20',
    searchInputMobile:
      'w-full rounded-full border-none bg-surface-container-low py-2.5 pl-10 pr-4 text-body-sm outline-none transition-all focus:ring-2 focus:ring-primary/20',
    actions: 'ml-auto flex shrink-0 items-center gap-5 md:gap-7',
    iconBtn:
      'rounded-full p-3 text-on-surface transition-all hover:bg-surface-container-high',
    iconBtnGhost:
      'cursor-pointer border-none bg-transparent p-3 text-on-surface transition-colors hover:text-primary',
    cartBadge:
      'absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary',
    notifyDot:
      'absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary',
    userBtn:
      'flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-on-surface transition-colors hover:text-primary',
    userName: 'max-w-[100px] truncate text-sm font-bold leading-tight',
    userLabel: 'text-sm font-bold leading-tight',
    dropdown: `absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-slate-border bg-bg-card py-2 ${ds.shadow.elevated}`,
    dropdownItem:
      'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container-low',
    dropdownItemDanger:
      'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-primary transition-colors hover:bg-primary-light',
    dropdownDivider: 'my-1 border-t border-slate-border',
    mobileMenu:
      'absolute left-0 top-[95px] z-50 w-full border-b border-slate-border bg-bg-card shadow-elevated lg:hidden',
    mobileNav: 'flex flex-col gap-1',
    mobileNavItem:
      'rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-surface-container-low',
    mobileNavItemAccent:
      'rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-light',
  },

  footer: {
    root: 'w-full border-t border-outline-variant bg-bg-card',
    inner:
      'w-full py-10 pl-[calc(0.75rem+50px)] pr-3 md:py-12 md:pl-[calc(1rem+50px)] md:pr-4',
    grid: 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10',
    brandTitle: 'mb-4 text-headline-lg font-bold text-primary',
    colTitle:
      'mb-4 text-sm font-bold uppercase tracking-wider text-on-surface',
    body: 'mb-4 text-body-sm leading-relaxed text-on-surface-variant',
    link: 'text-on-surface-variant no-underline transition-colors hover:text-primary',
    iconBox:
      'material-symbols-outlined flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none text-secondary',
  },
};
