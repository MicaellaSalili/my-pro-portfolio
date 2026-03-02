"use client";

interface FooterLink {
  label: string;
  href?: string;
  sectionId?: string;
  workCategory?: string;
}

interface FooterProps {
  contactLinks: FooterLink[];
  worksLinks: FooterLink[];
  aboutLinks: FooterLink[];
  ownerName?: string;
  onAboutLinkClick?: (sectionId: string) => void;
  onWorksLinkClick?: (category: string) => void;
}

export default function Footer({
  contactLinks,
  worksLinks,
  aboutLinks,
  ownerName,
  onAboutLinkClick,
  onWorksLinkClick,
}: FooterProps) {
  const renderFooterItem = (item: FooterLink) => {
    if (item.sectionId && onAboutLinkClick) {
      return (
        <button
          type="button"
          onClick={() => onAboutLinkClick(item.sectionId || "")}
          className="text-white/90 underline-offset-4 transition-all hover:text-white hover:underline active:text-white active:underline focus-visible:text-white focus-visible:underline"
        >
          {item.label}
        </button>
      );
    }

    if (item.workCategory && onWorksLinkClick) {
      return (
        <button
          type="button"
          onClick={() => onWorksLinkClick(item.workCategory || "")}
          className="text-white/90 underline-offset-4 transition-all hover:text-white hover:underline active:text-white active:underline focus-visible:text-white focus-visible:underline"
        >
          {item.label}
        </button>
      );
    }

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
    <footer className="mx-auto mt-12 flex w-full max-w-[1440px] flex-col items-center justify-between rounded-tl-[60px] rounded-tr-[60px] bg-primary px-2 py-5 text-white shadow-[inset_0px_4px_4px_0px_#805eff] sm:rounded-tl-[100px] sm:rounded-tr-[100px] sm:px-[10px] sm:py-[30px]">
      <div className="mb-4 h-[3px] w-[120px] rounded-full bg-white/80 sm:mb-6 sm:h-[4px] sm:w-[305px]" />
      <div className="flex w-full max-w-[1200px] flex-col gap-6 border-b border-white/60 px-2 pb-6 pt-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-8 sm:pb-8 sm:pt-8">
        <div className="px-1 sm:px-[10px] mb-2 sm:mb-0">
          <h4 className="mb-2 text-[18px] font-medium sm:mb-4 sm:text-[20px]">Contact Me</h4>
          <ul className="space-y-[4px] text-[15px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {contactLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-1 sm:px-[10px] mb-2 sm:mb-0">
          <h4 className="mb-2 text-[18px] font-medium sm:mb-4 sm:text-[20px]">Works</h4>
          <ul className="space-y-[4px] text-[15px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {worksLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-1 sm:px-[10px]">
          <h4 className="mb-2 text-[18px] font-medium sm:mb-4 sm:text-[20px]">About</h4>
          <ul className="space-y-[4px] text-[15px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {aboutLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] font-bold sm:mt-4 sm:text-[14px]">© 2026 {ownerName || "Micaalla Salili"}. All rights reserved.</p>
    </footer>
  );
}
