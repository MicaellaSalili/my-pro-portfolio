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
    <footer className="mx-auto mt-12 flex w-full max-w-[1440px] flex-col items-center justify-between rounded-tl-[32px] rounded-tr-[32px] bg-primary px-4 py-6 text-white shadow-[inset_0px_4px_4px_0px_#805eff] sm:rounded-tl-[100px] sm:rounded-tr-[100px] sm:px-[10px] sm:py-[30px]">
      <div className="mb-6 h-[3px] w-[80px] rounded-full bg-white/80 sm:mb-6 sm:h-[4px] sm:w-[305px]" />
      
      <div className="grid w-full max-w-[1200px] grid-cols-2 gap-x-4 gap-y-8 border-b border-white/60 px-2 pb-8 pt-4 sm:grid-cols-3 sm:gap-4 sm:px-8 sm:pb-8 sm:pt-8">
        <div className="px-1 sm:px-[10px]">
          <h4 className="mb-2 text-[16px] font-bold tracking-wide uppercase text-white/70 sm:text-[20px] sm:normal-case sm:text-white sm:font-medium">
            Contact Me
          </h4>
          <ul className="space-y-[6px] text-[14px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {contactLinks.map((item) => (
              <li key={item.label} className="break-all">
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-1 sm:px-[10px]">
          <h4 className="mb-2 text-[16px] font-bold tracking-wide uppercase text-white/70 sm:text-[20px] sm:normal-case sm:text-white sm:font-medium">
            Works
          </h4>
          <ul className="space-y-[6px] text-[14px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {worksLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 px-1 sm:col-span-1 sm:px-[10px]">
          <h4 className="mb-2 text-[16px] font-bold tracking-wide uppercase text-white/70 sm:text-[20px] sm:normal-case sm:text-white sm:font-medium">
            About
          </h4>
          <ul className="space-y-[6px] text-[14px] leading-[1.4] sm:space-y-[6px] sm:text-[16px]">
            {aboutLinks.map((item) => (
              <li key={item.label}>
                {renderFooterItem(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <p className="mt-4 text-center text-[12px] font-medium opacity-80 sm:mt-4 sm:text-[14px] sm:font-bold sm:opacity-100">
        © 2026 {ownerName || "Micaalla Salili"}. All rights reserved.
      </p>
    </footer>
  );
}