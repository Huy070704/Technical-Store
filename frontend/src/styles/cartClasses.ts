import { ds } from './designSystem';

export const cart = {
  pageShell: ds.layout.pageShell,
  checkoutContainer: ds.layout.pageShell,
  cartContent: `${ds.layout.containerWide} grid grid-cols-1 items-start gap-10 py-10 lg:grid-cols-[1fr_350px]`,
  cartItems: 'flex flex-col gap-6',
  cartSummary: `${ds.card.base} ${ds.card.paddingLg} ${ds.card.stickySidebar}`,
  cartSummaryTitle: `mb-5 ${ds.typo.headlineLg}`,
  summaryDetails: 'mb-0',
  summaryRow: ds.summary.row,
  summaryTotal: ds.summary.total,

  emptyCart: `${ds.state.emptyCard} my-[120px] mb-[60px] max-md:mx-5 max-md:my-[100px] max-md:mb-10 max-md:px-6 max-md:py-10`,
  emptyCartIcon: `mx-auto mb-5 block h-20 w-20 text-primary ${ds.shadow.primaryGlow} max-md:mb-4 max-md:h-16 max-md:w-16`,
  emptyCartTitle: `mb-3 ${ds.typo.headlineLg} max-md:mb-2.5 max-md:text-xl`,
  emptyCartText: `mx-auto mb-7 max-w-[320px] ${ds.typo.bodySmMuted} max-md:mb-6`,
  continueShoppingButton: `${ds.btn.primary} rounded-sm px-7 py-3.5 shadow-primary-glow hover:-translate-y-px active:translate-y-0 max-md:px-6 max-md:py-3 [&_svg]:h-[18px] [&_svg]:w-[18px]`,
  continueShoppingBtn: `${ds.btn.primaryFull} ${ds.shadow.primaryGlow} mb-4 [&_svg]:h-[18px] [&_svg]:w-[18px]`,

  cartProductCard: `${ds.card.base} ${ds.card.interactive} relative overflow-hidden rounded-lg`,
  cartProductCardSelected: 'border-primary/40 ring-2 ring-primary/15',
  cartProductCardTop:
    'flex items-center justify-between border-b border-slate-border/80 bg-surface-container-low/40 px-4 py-2.5',
  cartProductSelect: 'flex cursor-pointer items-center gap-2',
  cartProductRemove: ds.btn.icon,
  cartProductCardBody:
    'grid gap-5 p-4 md:grid-cols-[120px_1fr_auto] md:gap-6 md:p-5',
  cartProductImageBtn:
    'group relative mx-auto block h-[120px] w-[120px] shrink-0 overflow-hidden rounded-md border border-slate-border bg-surface-container-low md:mx-0',
  cartProductImage:
    'h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105',
  cartProductImageOverlay:
    'absolute inset-0 flex items-center justify-center bg-primary/0 text-on-primary opacity-0 transition-all group-hover:bg-primary/50 group-hover:opacity-100',
  cartProductInfo: 'flex min-w-0 flex-col gap-3 text-left',
  cartProductTitleBtn: 'text-left transition-colors hover:text-primary',
  cartProductName: 'm-0 text-lg font-semibold leading-snug text-on-surface md:text-xl',
  cartProductCategory: `mt-1 block ${ds.typo.bodySmMuted}`,
  cartProductMetaGrid: 'grid grid-cols-1 gap-2 sm:grid-cols-3',
  cartProductMetaCell:
    'flex items-start gap-2 rounded-sm border border-slate-border/60 bg-surface-container-low/50 px-3 py-2',
  cartProductMetaLabel: ds.typo.labelXs,
  cartProductMetaValue: 'block text-body-sm font-semibold text-on-surface',
  cartProductDetailLink:
    'inline-flex w-fit items-center gap-1 text-body-sm font-medium text-primary transition-colors hover:text-primary-hover',
  cartProductQtyPanel:
    'flex flex-col gap-3 rounded-md border-2 border-primary/15 bg-gradient-to-b from-primary-light/30 to-bg-card p-4 md:min-w-[200px]',
  cartProductQtyTitle:
    'text-center text-label-xs font-semibold uppercase tracking-wider text-primary',
  cartProductQtyControl: 'flex items-center justify-center gap-2',
  cartProductQtyBtn: `${ds.control.qtyBtn} h-10 w-10 rounded-md`,
  cartProductQtyDisplay: 'flex min-w-[72px] flex-col items-center px-2',
  cartProductQtyNumber: 'text-2xl font-bold tabular-nums text-primary',
  cartProductQtyUnit: ds.typo.labelXs,
  cartProductQtyWarn: `text-center ${ds.typo.labelXs} text-warning`,
  cartProductLineTotal:
    'flex flex-col items-center gap-0.5 border-t border-slate-border/80 pt-3',
  cartProductLineTotalLabel: ds.typo.labelXs,
  cartProductLineTotalValue: 'text-lg font-bold text-on-surface',

  cartItemCard: `${ds.card.base} ${ds.card.paddingLg} relative mb-2 grid min-h-[150px] grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] items-center gap-6 transition-all hover:-translate-y-1 hover:shadow-elevated max-md:flex max-md:flex-col max-md:items-center max-md:gap-4 max-md:p-5 max-md:text-center`,
  leftSection:
    'col-start-1 row-span-2 flex flex-col items-center gap-4 max-md:w-full max-md:items-center',
  itemImage:
    'h-[120px] w-[120px] shrink-0 rounded-full object-cover max-md:h-[100px] max-md:w-[100px]',
  imagePlaceholderRound:
    'flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-border bg-surface-container-low text-label-xs text-secondary max-md:h-[100px] max-md:w-[100px]',
  itemContent:
    'col-start-2 row-start-1 flex flex-col justify-center gap-3 self-center py-10 pr-10 max-md:w-full max-md:p-0',
  itemInfo:
    'flex flex-1 flex-col gap-2 pl-5 text-body-sm max-md:mt-2.5 max-md:w-full max-md:pl-0 max-md:text-center',
  itemName: 'm-0 text-lg font-semibold leading-snug text-primary max-md:text-base',
  itemCategory: ds.typo.bodySm,
  itemPrice: ds.typo.price,
  removeButton:
    'absolute right-4 top-4 z-[1] cursor-pointer rounded-sm border-none bg-transparent p-2 text-secondary transition-all hover:bg-primary-light hover:text-error max-md:right-3 max-md:top-3 [&_svg]:h-5 [&_svg]:w-5',
  rightSection:
    'col-start-3 row-start-2 flex items-end justify-end max-md:w-full max-md:items-center max-md:justify-center',
  itemTotalBlock: 'text-right max-md:text-center',
  itemTotalLabel: `mb-1 block ${ds.typo.bodySmMuted} font-medium`,
  totalValue: 'text-lg font-bold text-on-surface max-md:text-base',
  quantityControlsCol:
    'flex flex-col items-center gap-2 max-md:w-full max-md:flex-row max-md:flex-wrap max-md:justify-center max-md:gap-3',
  quantityLabel: `text-body-sm font-medium text-on-surface max-md:mb-2 max-md:w-full max-md:text-center`,
  quantityInputGroup: 'flex items-center gap-3 max-md:justify-center',
  quantityButton: `${ds.control.qtyBtn} h-9 w-9 text-lg max-md:h-8 max-md:w-8`,
  quantity: 'min-w-6 text-center text-base font-medium text-on-surface',

  checkoutButton: ds.btn.primaryFull,
  checkoutButtonDisabled:
    '!cursor-not-allowed !bg-secondary !opacity-60 hover:!bg-secondary',
  noSelectionWarning: `${ds.alert.base} ${ds.alert.warning} mb-4 [&_p]:m-0 [&_p]:font-medium`,
  shippingPromo: `mt-4 rounded-md bg-surface-container-low p-3 text-center ${ds.typo.bodySmMuted}`,

  cartItemRow: `${ds.card.base} ${ds.card.paddingMd} mb-4 flex items-center gap-4 max-sm:flex-col max-sm:gap-3`,
  selectionCheckbox: 'mr-2 flex shrink-0 items-center justify-center',
  checkbox: ds.control.checkbox,
  productImage:
    'h-20 w-20 shrink-0 [&_img]:mx-auto [&_img]:block [&_img]:h-20 [&_img]:w-full [&_img]:rounded-md [&_img]:bg-bg-card [&_img]:object-contain',
  imagePlaceholder:
    'flex h-full w-full items-center justify-center rounded-md bg-surface-container-low text-label-xs text-secondary',
  productInfo: 'flex flex-1 flex-col gap-1',
  productName: `m-0 ${ds.typo.labelMd} leading-tight`,
  productCategory: `m-0 ${ds.typo.bodySmMuted} leading-tight`,
  productPrice: `m-0 ${ds.typo.price} leading-tight`,
  stockInfo: 'mt-1',
  stockStatus: 'rounded-sm px-1.5 py-0.5 text-label-xs font-medium',
  stockIn: 'rounded-sm bg-tertiary/10 px-1.5 py-0.5 text-label-xs font-medium text-tertiary',
  stockOut: 'rounded-sm bg-error-container px-1.5 py-0.5 text-label-xs font-medium text-error',
  itemControls:
    'flex shrink-0 flex-col items-end gap-3 max-sm:w-full max-sm:flex-row max-sm:items-center max-sm:justify-between',
  quantityControlsRow: 'flex items-center gap-2',
  quantityBtn: ds.control.qtyBtn,
  removeBtn:
    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-red-300 bg-bg-card text-sm text-error transition-all hover:border-error hover:bg-error hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50 max-[480px]:h-7 max-[480px]:w-7',
  itemTotalCol: 'flex flex-col items-end gap-0.5',
  totalLabel: `uppercase tracking-wider ${ds.typo.labelXs}`,
  totalAmount: 'text-base font-semibold text-on-surface',
  itemActions: 'flex items-center',

  checkoutContent: `${ds.layout.containerWide} grid grid-cols-1 items-start gap-10 p-5 lg:grid-cols-[1fr_350px] max-md:mt-[100px] max-md:gap-6`,
  orderDetails: ds.layout.sectionGap,
  orderItemsCard: `${ds.card.base} ${ds.card.paddingLg}`,
  orderItemRow: `${ds.table.row} grid min-h-[100px] grid-cols-[auto_1fr_auto] items-stretch gap-5 py-4 max-md:grid-cols-1 max-md:p-4`,
  orderItemLeft: 'flex flex-col items-start gap-2',
  orderItemImage: 'h-20 w-20 rounded-md object-cover max-[480px]:h-[120px] max-[480px]:w-[120px]',
  orderItemImagePlaceholder:
    'flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-slate-border bg-surface-container-low text-label-xs text-secondary max-[480px]:h-[120px] max-[480px]:w-[120px]',
  orderItemQuantity: 'text-body-sm font-semibold text-on-surface',
  orderItemInfo:
    'flex flex-col justify-center gap-1 [&_h3]:m-0 [&_h3]:text-base [&_h3]:text-on-surface',
  orderItemCategory: ds.typo.bodySmMuted,
  orderItemTotal:
    'flex items-end justify-end text-right text-base font-semibold text-on-surface max-md:justify-start max-md:text-left',
  shippingForm: `${ds.card.elevated} ${ds.card.paddingLg} mb-6 text-left max-md:p-5`,
  shippingFormTitle: `${ds.layout.sectionHeader} ${ds.typo.headlineLg} before:content-['👤'] before:text-lg`,
  addressSection: 'mt-8',
  addressSectionTitle: `${ds.layout.sectionHeader} ${ds.typo.headlineLg} before:content-['📍'] before:text-lg`,
  formGroup: ds.input.group,
  formLabel: ds.input.label,
  formInput: ds.input.field,
  formSelect: `${ds.input.field} disabled:cursor-not-allowed disabled:border-slate-border disabled:bg-surface-container-low disabled:text-secondary`,
  formHint: ds.input.hint,
  formRow: ds.input.row,
  orderSummary: `${ds.card.base} ${ds.card.paddingLg} ${ds.card.stickySidebar}`,
  orderSummaryTitle: `mb-6 ${ds.typo.headlineLg}`,
  placeOrderButton: `${ds.btn.primaryFull} disabled:bg-bg-soft`,
  codButton: 'bg-tertiary hover:bg-tertiary-container hover:-translate-y-px disabled:hover:translate-y-0',
  payosButton: 'bg-secondary hover:bg-inverse-surface hover:-translate-y-px disabled:hover:translate-y-0',
  errorMessage: `${ds.alert.base} border-error/30 bg-error-container text-error text-center`,
  fieldError: ds.input.error,
  guestNotification: `${ds.alert.base} border-secondary-container bg-surface-container-low [&_strong]:text-primary`,
  guestNotificationIcon: 'mt-0.5 shrink-0 text-xl text-secondary',
  guestNotificationText: 'flex-1 text-on-surface',

  paymentSectionSummary: 'mb-5 border-b border-slate-border pb-5',
  paymentSectionSummaryTitle: 'mb-4 text-base font-semibold text-on-surface',
  paymentMethodsCompact: 'flex flex-col gap-2',
  paymentOptionCompact: `${ds.card.base} p-0 transition-all hover:border-outline-variant has-[:checked]:border-primary has-[:checked]:bg-primary-light/50`,
  paymentRadio: 'absolute cursor-pointer opacity-0',
  paymentLabelCompact:
    'm-0 flex w-full cursor-pointer items-center gap-3 p-3 max-[480px]:gap-2.5 max-[480px]:p-2.5',
  paymentIconCompact:
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-container-low text-lg has-[:checked]:bg-primary-light max-[480px]:h-7 max-[480px]:w-7',
  paymentInfoCompact: 'flex flex-1 flex-col gap-0.5',
  paymentTitle:
    'text-body-sm font-semibold text-on-surface has-[:checked]:text-primary max-[480px]:text-[13px]',
  paymentDesc:
    'text-label-xs text-secondary has-[:checked]:text-indigo-800 max-[480px]:text-[11px]',
  paymentNoteCompact:
    'mt-3 rounded-sm border border-sky-500 bg-sky-50 p-2.5 text-label-xs text-blue-800 max-[480px]:p-2',

  pagination: `${ds.card.base} mt-5 flex items-center justify-between p-2.5 max-md:flex-col max-md:gap-4`,
  paginationInfo: `${ds.typo.bodySmMuted} max-md:pl-4`,
  paginationControls: 'flex items-center gap-2 max-md:pr-4',
  paginationButton: `${ds.btn.ghost} h-8 w-8 border border-slate-border p-0`,
  currentPage:
    'flex h-8 w-8 items-center justify-center rounded-sm bg-primary font-semibold text-on-primary',
  spinner: 'h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary',

  checkoutPageWrap: ds.layout.pageWithHeader,
  checkoutPageContainer: ds.layout.container,
  alertBase: ds.alert.base,
  alertSuccess: `${ds.alert.base} ${ds.alert.success}`,
  alertWarning: `${ds.alert.base} ${ds.alert.warning}`,
  alertClose: ds.alert.close,
  loadingWrap: ds.state.loadingWrap,
  loadingInner: ds.state.loadingInner,
  loadingSpinner: ds.state.loadingSpinner,
  emptyStateWrap: ds.state.emptyWrap,
  primaryBtn: `${ds.btn.primary} px-5 py-2.5`,
};
