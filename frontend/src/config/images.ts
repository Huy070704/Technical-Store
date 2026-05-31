/**
 * Đường dẫn ảnh tĩnh (public/assets/images).
 * Thay mọi `/img/...` cũ bằng hằng số trong `images` hoặc `imageUrl()`.
 */
export const imageUrl = (...segments: string[]) =>
  `/assets/images/${segments.map((s) => encodeURIComponent(s)).join('/')}`;

export const images = {
  tabLogo: imageUrl('tab_logo.png'),
  logo: imageUrl('logonew.png'),
  logoAlt: imageUrl('logo.png'),
  logoCompact: imageUrl('lo.png'),
  contact: imageUrl('contact.png'),
  ctnen: imageUrl('ctnen.png'),
  pc: imageUrl('pc.png'),
  pcPhoto: imageUrl('pc.jpg'),
  pexels: imageUrl('pexels.png'),
  glow: imageUrl('glowGIF.gif'),
  anh1: imageUrl('anh1.gif'),

  shop: {
    shop01: imageUrl('shop01.png'),
    shop02: imageUrl('shop02.png'),
    shop03: imageUrl('shop03.png'),
  },

  categories: {
    c1: imageUrl('c1.png'),
    c2: imageUrl('c2.png'),
    c3: imageUrl('c3.png'),
    c4: imageUrl('c4.png'),
    c5: imageUrl('c5.png'),
    c6: imageUrl('c6.png'),
    c7: imageUrl('c7.png'),
    c8: imageUrl('c8.png'),
  },

  slides: [
    imageUrl('slide-1.png'),
    imageUrl('slide-2.jpg'),
    imageUrl('slide-3.jpg'),
  ] as const,

  banners: {
    banner1: imageUrl('banner', 'banner1.png'),
    banner2: imageUrl('banner', 'banner2.png'),
    banner3: imageUrl('banner', 'banner3.jpg'),
    banner4: imageUrl('banner', 'banner4.png'),
    banner5: imageUrl('banner', 'banner5.png'),
    banner6: imageUrl('banner', 'banner6.jpg'),
    banner7: imageUrl('banner', 'banner7.png'),
    banner8: imageUrl('banner', 'banner8.png'),
    banner9: imageUrl('banner', 'banner9.png'),
    banner10: imageUrl('banner', 'banner10.png'),
    banner11: imageUrl('banner', 'banner11.png'),
    banner12: imageUrl('banner', 'banner12.png'),
    banner13: imageUrl('banner', 'banner13.png'),
    banner14: imageUrl('banner', 'banner14.png'),
  },

  banks: {
    acb: imageUrl('banks', 'acb.png'),
    bidv: imageUrl('banks', 'bidv.png'),
    mb: imageUrl('banks', 'mb.png'),
    shb: imageUrl('banks', 'shb.png'),
    tcb: imageUrl('banks', 'tcb.png'),
    vcb: imageUrl('banks', 'vcb.png'),
    vpb: imageUrl('banks', 'vpb.png'),
    vtb: imageUrl('banks', 'vtb.png'),
  },
} as const;

/** Danh sách banner carousel (theo thứ tự hiển thị) */
export const bannerSlides = [
  images.banners.banner1,
  images.banners.banner2,
  images.banners.banner3,
  images.banners.banner4,
  images.banners.banner5,
  images.banners.banner6,
  images.banners.banner7,
  images.banners.banner8,
  images.banners.banner9,
  images.banners.banner10,
  images.banners.banner11,
  images.banners.banner12,
  images.banners.banner13,
  images.banners.banner14,
] as const;
