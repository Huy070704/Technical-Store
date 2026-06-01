import MaterialIcon from '../shared/MaterialIcon';

const AdminFooter = () => {
  return (
    <footer className="border-t border-slate-border bg-surface-container-highest">
      <div className="grid w-full grid-cols-1 gap-lg px-margin-mobile py-xl md:grid-cols-4 md:px-margin-desktop">
        <div className="space-y-md">
          <span className="text-headline-lg font-semibold text-on-surface">TechStore</span>
          <p className="text-body-sm text-on-surface-variant">
            Premier technology retail and inventory management solutions for modern enterprises.
          </p>
        </div>
        <FooterLinks title="Support" links={['Warranty Policy', 'Shipping Info', 'Returns']} />
        <FooterLinks title="Quick Links" links={['Store Locator', 'Privacy Settings', 'Contact Us']} />
        <div className="flex flex-col justify-between">
          <div>
            <h4 className="mb-md text-label-md text-on-surface">Connect</h4>
            <div className="flex gap-md">
              <MaterialIcon name="hub" className="cursor-pointer text-secondary transition-colors hover:text-primary" />
              <MaterialIcon name="share" className="cursor-pointer text-secondary transition-colors hover:text-primary" />
            </div>
          </div>
          <p className="mt-lg text-body-sm text-on-surface-variant opacity-80">© 2024 TechStore Retailers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

type FooterLinksProps = {
  title: string;
  links: string[];
};

const FooterLinks = ({ title, links }: FooterLinksProps) => (
  <div>
    <h4 className="mb-md text-label-md text-on-surface">{title}</h4>
    <ul className="space-y-sm">
      {links.map((link) => (
        <li key={link}>
          <a className="text-body-sm text-on-surface-variant transition-colors hover:text-primary" href="#">
            {link}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

export default AdminFooter;
