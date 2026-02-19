"use client";

interface FooterLink {
  label: string;
  href?: string;
}

interface FooterProps {
  contactLinks: FooterLink[];
  worksLinks: FooterLink[];
  aboutLinks: FooterLink[];
  ownerName?: string;
}

export default function Footer({ contactLinks, worksLinks, aboutLinks, ownerName }: FooterProps) {
  const renderFooterItem = (item: FooterLink) => {
    if (!item.href) {
      return <span className="text-white/90">{item.label}</span>;
    }

    return (
      <a
        href={item.href}
        target={item.href.startsWith("http") ? "_blank" : undefined}
        rel={item.href.startsWith("http") ? "noreferrer" : undefined}
        className="text-white/90 underline-offset-4 transition-all hover:text-white hover:underline active:text-white active:underline focus-visible:text-white focus-visible:underline"
      >
        {item.label}
      </a>
    );
  };

  return (
    <footer className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between rounded-tl-[100px] rounded-tr-[100px] bg-primary px-[10px] py-[30px] text-white shadow-[inset_0px_4px_4px_0px_#805eff]">
      <div className="mb-6 h-[4px] w-[305px] rounded-full bg-white/80" />
      <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 border-b border-white/60 px-8 pb-8 pt-8 md:grid-cols-3">
        <div className="px-[10px]">
          <h4 className="mb-4 text-[20px] font-medium">Contact Me</h4>
          <ul className="space-y-[6px] text-[16px] leading-[1.4]">
            {contactLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-[10px]">
          <h4 className="mb-4 text-[20px] font-medium">Works</h4>
          <ul className="space-y-[6px] text-[16px] leading-[1.4]">
            {worksLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-[10px]">
          <h4 className="mb-4 text-[20px] font-medium">About</h4>
          <ul className="space-y-[6px] text-[16px] leading-[1.4]">
            {aboutLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-center text-[14px] font-bold">© 2026 {ownerName || "Micaalla Salili"}. All rights reserved.</p>
    </footer>
  );
}
