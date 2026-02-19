"use client";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function Navbar({ currentPage, setCurrentPage }: NavbarProps) {
  const navItems = [
    { label: "Home", page: "home" },
    { label: "Works", page: "works" },
    { label: "About", page: "about" },
    { label: "Contact", page: "contact" },
  ];

  const handleNavClick = (page: string) => {
    setCurrentPage(page);
  };

  const handleHomeClick = () => {
    setCurrentPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className="mx-auto flex items-center justify-center gap-8 bg-transparent px-6 md:px-10"
      style={{ maxWidth: 1440, height: 112 }}
    >
      <div
        className="absolute left-6 flex h-[64px] w-[64px] flex-shrink-0 cursor-pointer items-center justify-center md:left-10"
      >
        <button
          onClick={handleHomeClick}
          className="flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
          aria-label="Go to Home"
        >
          <img
            src="/logo.svg"
            alt="Logo"
            className="h-16 w-auto select-none"
            style={{ maxWidth: 64, maxHeight: 64 }}
          />
        </button>
      </div>

      <ul className="hidden h-[52px] w-auto items-center gap-1 rounded-full border border-white/70 bg-white/70 px-1 shadow-[0_10px_24px_rgba(17,24,39,0.08)] backdrop-blur-sm md:flex">
        {navItems.map((item) => (
          <li key={item.page} className="flex h-full items-center">
            <button
              onClick={() => handleNavClick(item.page)}
              className={`flex h-[42px] items-center rounded-full px-5 text-base font-semibold transition-all duration-200 ${
                currentPage === item.page
                  ? "bg-primary text-white shadow-[0_8px_20px_rgba(163,134,255,0.45)]"
                  : "text-slate-600 hover:bg-white hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="absolute right-6 flex flex-shrink-0 items-center justify-center md:right-10">
        <button
          onClick={() => handleNavClick("contact")}
          className="rounded-[18px] bg-[#0f1833] px-6 py-3 text-[16px] font-semibold text-white shadow-[0_14px_24px_rgba(15,24,51,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#101e42] active:translate-y-0 active:scale-[0.98] md:px-10"
          style={{ minWidth: 176 }}
        >
          Get In Touch
        </button>
      </div>
    </nav>
  );
}
