import { Link, useNavigate } from 'react-router-dom';

const footerColTitle =
  'font-bold text-on-surface mb-4 text-sm uppercase tracking-wider';
const footerIconBox =
  'material-symbols-outlined text-lg text-secondary leading-none shrink-0 w-6 h-6 flex items-center justify-center';
const footerLink =
  'hover:text-primary transition-colors no-underline text-on-surface-variant';

export const Footer = () => {
  const navigate = useNavigate();

  const goProducts = (filter?: string) => {
    if (filter) {
      navigate('/all-products', { state: { filter } });
    } else {
      navigate('/all-products', { state: { clearFilter: true } });
    }
  };

  return (
    <footer className="w-full bg-white border-t border-outline-variant">
      <div className="w-full pl-[calc(0.75rem+50px)] pr-3 md:pl-[calc(1rem+50px)] md:pr-4 py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div className="flex flex-col items-start text-left">
            <h3 className="text-headline-lg font-bold text-primary mb-4">TechnicalStore</h3>
            <p className="text-body-sm text-on-surface-variant mb-4 leading-relaxed">
              Hệ thống bán lẻ máy tính và thiết bị công nghệ hàng đầu Việt Nam. Cam kết mang đến
              giá trị và dịch vụ tốt nhất.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Website"
                className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">public</span>
              </a>
              <a
                href="#"
                aria-label="Chat"
                className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
              </a>
              <a
                href="#"
                aria-label="Video"
                className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">smart_display</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start text-left">
            <h4 className={footerColTitle}>Danh mục</h4>
            <ul className="space-y-2.5 text-body-sm text-on-surface-variant">
              <li>
                <button
                  type="button"
                  className={`${footerLink} bg-transparent border-none cursor-pointer p-0 text-left`}
                  onClick={() => navigate('/')}
                >
                  Trang chủ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`${footerLink} bg-transparent border-none cursor-pointer p-0 text-left`}
                  onClick={() => goProducts()}
                >
                  Tất cả sản phẩm
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`${footerLink} bg-transparent border-none cursor-pointer p-0 text-left`}
                  onClick={() => goProducts('laptop')}
                >
                  Laptop
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`${footerLink} bg-transparent border-none cursor-pointer p-0 text-left`}
                  onClick={() => goProducts('pc')}
                >
                  PC
                </button>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-start text-left">
            <h4 className={footerColTitle}>Thông tin</h4>
            <ul className="space-y-2.5 text-body-sm text-on-surface-variant">
              <li>
                <Link to="/about" className={footerLink}>
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link to="/contact" className={footerLink}>
                  Liên hệ
                </Link>
              </li>
              <li>
                <a href="#" className={footerLink}>
                  Chính sách bảo mật
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-start text-left min-w-0">
            <h4 className={footerColTitle}>Liên hệ</h4>
            <ul className="space-y-2.5 text-body-sm text-on-surface-variant w-full">
              <li className="flex items-center gap-2">
                <span className={footerIconBox}>call</span>
                <span className="leading-snug">Hotline: 1900 6000</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className={footerIconBox}>mail</span>
                <span className="leading-snug break-all">Email: care@arcticstore.vn</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`${footerIconBox} mt-0.5`}>location_on</span>
                <span className="leading-snug">Địa chỉ: Tòa nhà Arctic, TP. Hồ Chí Minh</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
