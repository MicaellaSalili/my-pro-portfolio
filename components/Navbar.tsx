"use client";

import { useState, useEffect } from "react";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function Navbar({ currentPage, setCurrentPage }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const activeNavPage = currentPage === "project-details" ? "works" : currentPage;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", page: "home" },
    { label: "Works", page: "works" },
    { label: "About", page: "about" },
    { label: "Contact", page: "contact" },
  ];

  const handleNavClick = (page: string) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  const handleHomeClick = () => {
    setCurrentPage("home");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 mx-auto flex items-center justify-center gap-8 px-6 transition-all duration-300 lg:px-10 ${
        isScrolled
          ? "h-[80px] bg-white/70 shadow-lg backdrop-blur-md"
          : "h-[112px] bg-transparent"
      }`}
      style={{ maxWidth: 1440 }}
    >
      <div className="absolute left-6 flex h-[64px] w-[64px] flex-shrink-0 cursor-pointer items-center justify-center lg:left-10">
        <button
          onClick={handleHomeClick}
          className="flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
          aria-label="Go to Home"
        >
          <img src="/logo.svg" alt="Logo" className="h-16 w-auto select-none" style={{ maxWidth: 64, maxHeight: 64 }} />
        </button>
      </div>

      <ul className="hidden h-[52px] w-auto items-center gap-1 rounded-full border border-white/70 bg-white/70 px-1 shadow-[0_10px_24px_rgba(17,24,39,0.08)] backdrop-blur-sm lg:flex">
        {navItems.map((item) => (
          <li key={item.page} className="flex h-full items-center">
            <button
              onClick={() => handleNavClick(item.page)}
              className={`flex h-[42px] items-center rounded-full px-5 text-base font-semibold transition-all duration-200 ${
                activeNavPage === item.page
                  ? "bg-primary text-white shadow-[0_8px_20px_rgba(163,134,255,0.45)]"
                  : "text-slate-600 hover:bg-white hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="absolute right-6 flex items-center lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/85 text-[#0f1833] shadow-[0_12px_24px_rgba(15,24,51,0.14)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,24,51,0.18)] active:translate-y-0 active:scale-95"
        >
          <span className="relative block h-[16px] w-[18px]">
            <span className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-[#0f1833] transition-all duration-200 ${isMobileMenuOpen ? "top-[7px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-[7px] h-[2px] w-full rounded-full bg-[#0f1833] transition-all duration-200 ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`absolute left-0 top-[14px] h-[2px] w-full rounded-full bg-[#0f1833] transition-all duration-200 ${isMobileMenuOpen ? "top-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      <div className="absolute right-6 hidden flex-shrink-0 items-center justify-center lg:flex lg:right-10">
        <button
          onClick={() => handleNavClick("contact")}
          className="rounded-[18px] bg-[#0f1833] px-6 py-3 text-[16px] font-semibold text-white shadow-[0_14px_24px_rgba(15,24,51,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#101e42] active:translate-y-0 active:scale-[0.98] lg:px-10"
        >
          Get In Touch
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-6 right-6 top-[92px] z-40 rounded-[24px] border border-white/75 bg-white/92 p-3.5 shadow-[0_18px_34px_rgba(15,24,51,0.16)] backdrop-blur-md lg:hidden">
          <ul className="space-y-1.5">
            {navItems.map((item) => (
              <li key={`mobile-${item.page}`}>
                <button
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  className={`flex h-[44px] w-full items-center rounded-[14px] px-4 text-left text-[15px] font-semibold transition-all duration-200 ${
                    activeNavPage === item.page ? "bg-primary text-white shadow-[0_8px_18px_rgba(128,94,255,0.35)]" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}