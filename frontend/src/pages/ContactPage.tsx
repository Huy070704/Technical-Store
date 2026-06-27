import { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Truck,
  Headphones,
  Lock,
  MessageSquare,
  ChevronDown,
  Award,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';

const inputClass =
  'w-full p-4 bg-bg-card border border-slate-border rounded-lg text-on-surface text-body-sm placeholder:text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';

const EMAILJS_SERVICE_ID =
  import.meta.env.VITE_EMAILJS_SERVICE_ID ?? 'service_rqshknr';
const EMAILJS_TEMPLATE_ID =
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? 'template_tj8a3xn';
const EMAILJS_PUBLIC_KEY =
  import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? 'N_MB7gWT5V-WSfWBY';

type ToastType = 'info' | 'success' | 'error' | 'warning';

const showNotification = (message: string, type: ToastType = 'info') => {
  const notification = document.createElement('div');
  notification.textContent = message;

  const colors: Record<ToastType, string> = {
    success: '#008438',
    error: '#ba1a1a',
    warning: '#F59E0B',
    info: '#545f73',
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    max-width: 400px;
    word-wrap: break-word;
    background-color: ${colors[type]};
    animation: slideInRight 0.3s ease-out;
  `;

  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, 4700);
};

const infoBoxBase =
  'bg-bg-card rounded-xl p-6 flex items-center gap-4 border border-slate-border shadow-sm';

const infoBoxes = [
  {
    key: 'hotline',
    border: 'border-primary',
    iconBg: 'bg-primary',
    icon: Phone,
    title: 'Hotline',
    main: '1900-1234',
    sub: 'Hỗ trợ 24/7',
  },
  {
    key: 'email',
    border: 'border-tertiary',
    iconBg: 'bg-tertiary',
    icon: Mail,
    title: 'Email',
    main: 'Technical@gmail.com',
    sub: 'Phản hồi trong 2h',
  },
  {
    key: 'address',
    border: 'border-secondary',
    iconBg: 'bg-secondary',
    icon: MapPin,
    title: 'Địa chỉ',
    main: 'Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
    sub: null,
  },
  {
    key: 'workHours',
    border: 'border-warning',
    iconBg: 'bg-warning',
    icon: Clock,
    title: 'Giờ làm việc',
    main: '8:00 - 22:00',
    sub: 'Tất cả các ngày',
  },
];

const reasons = [
  {
    icon: Shield,
    borderColor: 'border-l-tertiary',
    iconColor: 'text-tertiary',
    title: 'Bảo hành chính hãng',
    desc: 'Cam kết 100% hàng chính hãng',
  },
  {
    icon: Truck,
    borderColor: 'border-l-warning',
    iconColor: 'text-warning',
    title: 'Giao hàng nhanh',
    desc: 'Giao hàng trong 2-4 giờ tại TP Hà Nội',
  },
  {
    icon: Lock,
    borderColor: 'border-l-primary',
    iconColor: 'text-primary',
    title: 'Chất lượng đảm bảo',
    desc: 'Kiểm tra kỹ trước khi giao',
  },
  {
    icon: Headphones,
    borderColor: 'border-l-secondary',
    iconColor: 'text-secondary',
    title: 'Tư vấn chuyên nghiệp',
    desc: 'Đội ngũ kỹ thuật giàu kinh nghiệm',
  },
];

export const ContactPage = () => {
  const form = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      showNotification('Vui lòng đăng nhập để gửi yêu cầu tư vấn!', 'warning');
      navigate('/login');
      return;
    }

    if (!form.current) return;

    setIsSubmitting(true);
    emailjs
      .sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form.current, EMAILJS_PUBLIC_KEY)
      .then(() => {
        showNotification('Cảm ơn bạn đã liên hệ!', 'success');
        form.current?.reset();
      })
      .catch(() => {
        showNotification('Có lỗi xảy ra, vui lòng thử lại.', 'error');
      })
      .finally(() => setIsSubmitting(false));
  };

  const displayName = user?.name ?? user?.email ?? '';

  return (
    <>
      <div className="min-h-screen bg-bg-base pb-12 pt-[95px]">
        <div
          className="relative mb-12 cursor-pointer overflow-hidden bg-[url('/img/ctnen.png')] bg-cover bg-center p-10 text-center max-sm:mb-8 max-sm:p-8 before:absolute before:inset-0 before:z-[1] before:bg-primary/20 before:content-['']"
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          role="button"
          tabIndex={0}
        >
          <h1 className="relative z-[2] mb-5 animate-fadeInUp text-[3em] font-bold tracking-widest text-white [text-shadow:2px_2px_4px_rgba(255,248,248,0.9)] max-sm:text-[2rem]">
            LIÊN HỆ VỚI CHÚNG TÔI
          </h1>
          <p className="relative z-[2] mb-4 text-[1.5em] font-medium text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.2)] max-sm:text-[1.2rem]">
            Chuyên cung cấp linh kiện máy tính chính hãng với giá tốt nhất thị trường
          </p>
          <p className="relative z-[2] mb-8 text-[1.2em] text-white/90 [text-shadow:1px_1px_2px_rgba(252,247,247,0.94)] max-sm:text-base">
            Giá tốt nhất thị trường - Bảo hành uy tín - Giao hàng nhanh chóng
          </p>

          <div className="relative z-[2] mt-10 flex justify-center gap-8 max-sm:flex-col max-sm:items-center max-sm:gap-4">
            {[
              { icon: Award, label: 'Uy tín hàng đầu' },
              { icon: CheckCircle, label: 'Bảo hành chính hãng' },
              { icon: Truck, label: 'Giao hàng nhanh' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex animate-slideIn items-center gap-2.5 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/20 hover:shadow-md max-sm:w-[80%]"
              >
                <Icon className="h-6 w-6 text-white" />
                <span className="text-[1.1em] font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto -mt-8 mb-12 grid max-w-[1200px] grid-cols-4 gap-6 px-4 max-lg:grid-cols-2 max-sm:-mt-4 max-sm:grid-cols-1">
          {infoBoxes.map((box) => {
            const Icon = box.icon;
            return (
              <div key={box.key} className={`${infoBoxBase} ${box.border}`}>
                <div
                  className={`flex h-12 w-12 min-w-12 items-center justify-center rounded-xl ${box.iconBg}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left overflow-hidden">
                  <h3 className="m-0 mb-1 text-sm font-normal text-secondary">{box.title}</h3>
                  <p className="m-0 mb-1 text-[1.1rem] font-semibold text-on-surface break-all">{box.main}</p>
                  {box.sub && <p className="m-0 text-sm text-secondary">{box.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto grid max-w-[1200px] grid-cols-[3fr_2fr] gap-8 px-4 max-lg:grid-cols-1 max-sm:my-8">
          <div className="rounded-2xl border border-slate-border bg-bg-card p-8 shadow-sm">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary">
                <MessageSquare className="h-6 w-6 text-on-primary" />
              </div>
              <div>
                <h2 className="m-0 mb-2 text-2xl font-semibold text-on-surface">
                  Gửi yêu cầu tư vấn
                </h2>
                <p className="m-0 text-sm text-secondary">
                  Chúng tôi sẽ phản hồi trong vòng 30 phút
                </p>
              </div>
            </div>

            {!isAuthenticated() && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                <Lock className="h-5 w-5 shrink-0 text-warning" />
                <p className="m-0 text-sm text-on-surface">
                  Vui lòng{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="cursor-pointer border-none bg-transparent p-0 font-semibold text-primary underline hover:text-primary-hover"
                  >
                    đăng nhập
                  </button>{' '}
                  để gửi yêu cầu tư vấn
                </p>
              </div>
            )}

            {isAuthenticated() && user && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-tertiary/30 bg-tertiary/10 p-4">
                <CheckCircle className="h-5 w-5 shrink-0 text-tertiary" />
                <p className="m-0 text-sm text-on-surface">
                  Xin chào <strong className="text-tertiary">{displayName}</strong>! Bạn có thể
                  gửi yêu cầu tư vấn.
                </p>
              </div>
            )}

            <form ref={form} onSubmit={sendEmail}>
              <div className="mb-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <input
                  type="text"
                  name="user_name"
                  placeholder="Họ và tên *"
                  defaultValue={isAuthenticated() && user ? displayName : ''}
                  required
                  className={inputClass}
                />
                <input
                  type="email"
                  name="user_email"
                  placeholder="Email *"
                  defaultValue={user?.email ?? ''}
                  required
                  className={inputClass}
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="Số điện thoại"
                  defaultValue={user?.phone ?? ''}
                  className={inputClass}
                />
                <div className="relative">
                  <select
                    name="service"
                    defaultValue=""
                    className={`${inputClass} cursor-pointer appearance-none pr-10`}
                  >
                    <option value="" disabled>
                      Tư vấn mua hàng
                    </option>
                    <option value="tuvan">Tư vấn sản phẩm</option>
                    <option value="baohanh">Bảo hành</option>
                    <option value="suachua">Sửa chữa</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                </div>
              </div>
              <textarea
                name="message"
                placeholder="Mô tả chi tiết yêu cầu của bạn *"
                required
                className={`${inputClass} mb-4 h-[120px] resize-none`}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-none bg-gradient-to-br from-primary to-primary-hover p-4 text-sm font-semibold uppercase text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-bg-soft"
              >
                <MessageSquare className="h-5 w-5" />
                {isSubmitting ? 'Đang gửi...' : 'GỬI YÊU CẦU TƯ VẤN'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="m-0 mb-6 text-[35px] font-semibold text-on-surface">
              Tại sao chọn chúng tôi?
            </h2>
            <div className="flex flex-col gap-8">
              {reasons.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.title}
                    className={`flex items-center gap-4 rounded-lg border border-slate-border border-l-4 bg-bg-card p-6 shadow-sm ${r.borderColor}`}
                  >
                    <Icon className={`h-8 w-8 shrink-0 ${r.iconColor}`} />
                    <div>
                      <h3 className="m-0 mb-1 text-left text-xl font-semibold text-on-surface">
                        {r.title}
                      </h3>
                      <p className="m-0 text-base leading-snug text-secondary">{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;
