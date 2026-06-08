import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  Truck,
  RefreshCw,
  BadgePercent,
  Headphones,
  Users,
  Package,
  Star,
  HeartHandshake,
  Cpu,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

const stats = [
  { value: '2M+', label: 'Khách hàng tin dùng', icon: Users },
  { value: '15K+', label: 'Sản phẩm đa dạng', icon: Package },
  { value: '4.9', label: 'Đánh giá trung bình', icon: Star },
  { value: '99%', label: 'Hài lòng dịch vụ', icon: HeartHandshake },
];

const services = [
  {
    icon: Truck,
    title: 'Giao hàng nhanh',
    desc: 'Miễn phí đơn từ 1.000.000đ — giao nội thành trong 2 giờ.',
    accent: 'bg-tertiary/10 text-tertiary',
  },
  {
    icon: RefreshCw,
    title: 'Đổi trả dễ dàng',
    desc: 'Chính sách đổi trả linh hoạt trong 30 ngày, hỗ trợ tận tâm.',
    accent: 'bg-secondary-container/60 text-secondary',
  },
  {
    icon: BadgePercent,
    title: 'Giá tốt nhất',
    desc: 'Cam kết giá cạnh tranh — linh kiện chính hãng, nguồn gốc rõ ràng.',
    accent: 'bg-primary-light text-primary',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    desc: 'Tư vấn build PC, bảo hành và kỹ thuật mọi lúc bạn cần.',
    accent: 'bg-surface-container-high text-on-surface',
  },
];

const values = [
  {
    icon: Cpu,
    title: 'Chuyên sâu công nghệ',
    text: 'Đội ngũ am hiểu phần cứng — tư vấn cấu hình phù hợp nhu cầu gaming, làm việc hay sáng tạo.',
  },
  {
    icon: ShieldCheck,
    title: 'Chính hãng & bảo hành',
    text: '100% sản phẩm có nguồn gốc, bảo hành toàn quốc theo tiêu chuẩn nhà sản xuất.',
  },
  {
    icon: HeartHandshake,
    title: 'Đồng hành lâu dài',
    text: 'Không chỉ bán hàng — chúng tôi đồng hành từ lúc chọn máy đến sau khi sử dụng.',
  },
];

const brandLogos = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

export const AboutPage = () => {
  const navigate = useNavigate();

  const scrollToMission = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <section className="relative overflow-hidden border-b border-slate-border/80 pt-[88px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_10%_-10%,rgba(183,0,17,0.09),transparent_50%),radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(0,104,43,0.06),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-page items-center gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div className="order-2 lg:order-1">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/50 px-3 py-1 text-label-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Từ 2015
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.1] tracking-tight text-on-surface">
              Hơn cả một
              <span className="mt-1 block text-primary">cửa hàng công nghệ</span>
            </h1>
            <p className="mt-5 max-w-xl text-body-md leading-relaxed text-secondary">
              TechnicalStore đồng hành cùng hàng triệu người yêu công nghệ — từ laptop
              làm việc đến dàn PC gaming đỉnh cao. Chúng tôi tuyển chọn linh kiện chất
              lượng, giá minh bạch và dịch vụ tận tâm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/all-products')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-[0_4px_14px_rgba(183,0,17,0.25)] transition-all hover:bg-primary-hover hover:-translate-y-0.5"
              >
                Khám phá sản phẩm
                <ChevronRight className="h-4 w-4" />
              </button>
              <a
                href="#mission"
                onClick={scrollToMission}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-border bg-bg-card px-6 py-3 text-sm font-semibold text-on-surface no-underline transition-colors hover:border-primary hover:text-primary"
              >
                Sứ mệnh của chúng tôi
                <ArrowDown className="h-4 w-4 animate-bounce" />
              </a>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-border/80 bg-bg-card/80 p-4 text-center backdrop-blur-sm transition-shadow hover:shadow-md"
                >
                  <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <div className="text-xl font-bold tabular-nums text-on-surface">{value}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-secondary">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-2xl border border-slate-border shadow-[0_20px_50px_rgba(11,28,48,0.12)]">
              <div className="absolute inset-0 z-[1] bg-gradient-to-t from-on-surface/50 via-transparent to-transparent" />
              <img
                src="/img/pexels.png"
                alt="Dàn PC gaming tại TechnicalStore"
                className="aspect-[4/3] w-full object-cover lg:aspect-auto lg:min-h-[480px]"
              />
              <div className="absolute bottom-0 left-0 right-0 z-[2] p-6 md:p-8">
                <p className="text-sm font-medium text-inverse-on-surface/90">
                  Build PC · Laptop · Linh kiện chính hãng
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="py-16 md:py-20">
        <div className="mx-auto max-w-page px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-headline-xl font-bold text-on-surface">Chúng tôi tin vào điều gì</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-secondary">
              Ba giá trị cốt lõi định hình mọi trải nghiệm mua sắm tại TechnicalStore.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-slate-border bg-bg-card p-6 transition-all hover:border-primary/25 hover:shadow-lg"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-headline-lg font-semibold text-on-surface">{title}</h3>
                <p className="mt-2 text-body-sm leading-relaxed text-secondary">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-border/80 bg-surface-container-low/40 py-16 md:py-20">
        <div className="mx-auto max-w-page px-4 md:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-xl font-bold text-on-surface">Dịch vụ nổi bật</h2>
              <p className="mt-2 max-w-lg text-body-sm text-secondary">
                Trọn gói từ tư vấn, mua hàng đến hậu mãi — để bạn yên tâm tập trung vào
                trải nghiệm.
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Liên hệ tư vấn
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-border/80 bg-bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-on-surface">{title}</h3>
                <p className="mt-2 text-body-sm leading-relaxed text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-page px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-headline-xl font-bold text-on-surface">Đối tác thương hiệu</h2>
            <p className="mt-3 text-body-sm text-secondary">
              Hợp tác với các hãng linh kiện và thiết bị hàng đầu thế giới.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-border bg-bg-card p-6 md:p-10">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:gap-8">
              {brandLogos.map((brand) => (
                <div
                  key={brand}
                  className="flex items-center justify-center rounded-xl bg-surface-container-low/50 p-4 grayscale transition-all hover:bg-surface-container-low hover:grayscale-0"
                >
                  <img
                    src={`/img/${brand}.png`}
                    alt={`Đối tác ${brand}`}
                    className="max-h-10 w-full object-contain opacity-70 transition-opacity hover:opacity-100 md:max-h-12"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-20">
        <div className="mx-auto max-w-page px-4 md:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-inverse-surface px-6 py-12 text-center md:px-12 md:py-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(183,0,17,0.35),transparent_55%)]" />
            <div className="relative z-[1]">
              <h2 className="text-headline-xl font-bold text-inverse-on-surface md:text-[28px]">
                Sẵn sàng build dàn máy mơ ước?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-body-sm text-inverse-on-surface/80">
                Hàng nghìn sản phẩm đang chờ — bắt đầu chọn linh kiện ngay hôm nay.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/all-products')}
                  className="rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover hover:-translate-y-0.5"
                >
                  Mua sắm ngay
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="rounded-xl border border-inverse-on-surface/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-inverse-on-surface backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  Liên hệ
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
