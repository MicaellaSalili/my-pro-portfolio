"use client";

import { useEffect, useState } from "react";

interface HeroSectionProps {
  setCurrentPage: (page: string) => void;
  profile: ProfileData | null;
}

interface ProfileData {
  name?: string;
  hero_title?: string;
  hero_sub_headline?: string;
  profile_image_url?: string;
  resume_download_url?: string;
  github_url?: string;
  linkedin_url?: string;
  email?: string;
  viber_number?: string;
  facebook_url?: string;
  instagram_url?: string;
}

const imgLinks = "/assets/hero/icon-profile.svg";
const imgVector = "/assets/hero/icon-github.svg";
const imgVector1 = "/assets/hero/icon-linkedin.svg";
const imgVector2 = "/assets/hero/icon-email.svg";
const imgGroup = "/assets/hero/icon-email-overlay.svg";
const imgVector3 = "/assets/hero/icon-viber.svg";
const imgVector4 = "/assets/hero/icon-facebook.svg";
const imgVector5 = "/assets/hero/icon-instagram.svg";
const imgArrow = "/assets/hero/icon-arrow.svg";

export default function HeroSection({ setCurrentPage, profile }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(true), 40);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!profile) {
    return (
      <section className="w-full px-6 pb-12 pt-4 md:px-10 lg:flex lg:min-h-[calc(100vh-120px)] lg:items-center lg:px-[70px] lg:py-0">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-[96px]">
          <div
            className="h-[260px] w-[260px] shrink-0 rounded-full border-2 bg-white/50 md:h-[300px] md:w-[300px] lg:h-[335px] lg:w-[335px]"
            style={{ borderColor: "var(--color-secondary)" }}
          />
          <div className="flex w-full max-w-[595px] flex-col items-start gap-6 px-1">
            <div className="h-6 w-[260px] rounded bg-white/60" />
            <div className="h-6 w-[320px] rounded bg-white/60" />
            <div className="h-5 w-full max-w-[560px] rounded bg-white/60" />
            <div className="h-5 w-[85%] rounded bg-white/60" />
          </div>
        </div>
      </section>
    );
  }

  const viberLink = profile.viber_number
    ? `viber://chat?number=${encodeURIComponent(profile.viber_number)}`
    : "";

  const socialLinks = [
    { href: profile.resume_download_url, label: "Resume", type: "image" as const, src: imgLinks },
    { href: profile.github_url, label: "GitHub", type: "image" as const, src: imgVector },
    { href: profile.linkedin_url, label: "LinkedIn", type: "image" as const, src: imgVector1 },
    {
      href: profile.email ? `mailto:${profile.email}` : "",
      label: "Email",
      type: "email" as const,
      src: imgVector2,
      srcOverlay: imgGroup,
    },
    { href: viberLink, label: "Viber", type: "image" as const, src: imgVector3 },
    { href: profile.facebook_url, label: "Facebook", type: "image" as const, src: imgVector4 },
    { href: profile.instagram_url, label: "Instagram", type: "image" as const, src: imgVector5 },
  ];

  return (
    <section className="w-full px-6 pb-10 pt-2 md:px-10 lg:flex lg:min-h-[calc(100vh-112px)] lg:items-center lg:px-[72px] lg:py-0">
      <div className={`mx-auto flex max-w-[1320px] flex-col-reverse items-center gap-10 transition-all duration-[900ms] ease-out lg:flex-row lg:items-center lg:justify-between lg:gap-[72px] motion-reduce:transition-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}>
        <div
          className="h-[280px] w-[280px] shrink-0 overflow-hidden rounded-full border-[10px] border-white shadow-[0_26px_48px_rgba(17,24,39,0.16)] transition-transform duration-500 ease-out hover:-translate-y-1 hover:scale-[1.03] md:h-[340px] md:w-[340px] lg:h-[430px] lg:w-[430px]"
        >
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className={`flex w-full max-w-[680px] flex-col items-start gap-7 px-1 transition-all duration-[950ms] delay-150 ease-out motion-reduce:transition-none ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}>
          <div className="text-[56px] font-extrabold leading-[0.95] text-[#0f1833] md:text-[72px] lg:text-[92px]">
            <p>{profile.hero_title}</p>
            <p className="font-extrabold" style={{ color: "var(--color-primary)" }}>
              {profile.name}
            </p>
          </div>

          <p className="max-w-[620px] text-[18px] font-medium leading-[1.45] text-slate-600 md:text-[21px]">
            {profile.hero_sub_headline}
          </p>

          <div className="flex w-full flex-wrap items-center gap-4 md:flex-nowrap md:justify-between md:gap-5">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href || "#"}
                target={item.href && !String(item.href).startsWith("mailto:") && !String(item.href).startsWith("viber:") ? "_blank" : undefined}
                rel={item.href && !String(item.href).startsWith("mailto:") && !String(item.href).startsWith("viber:") ? "noreferrer" : undefined}
                aria-label={item.label}
                onClick={(event) => {
                  if (!item.href) {
                    event.preventDefault();
                  }
                }}
                className="relative flex h-[44px] w-[44px] items-center justify-center rounded-full transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-110 hover:bg-white/40 active:scale-95"
              >
                <img src={item.src} alt="" className="h-[31px] w-[31px] object-contain" />
                {item.type === "email" && item.srcOverlay ? (
                  <img src={item.srcOverlay} alt="" className="pointer-events-none absolute h-[28px] w-[28px] object-contain" />
                ) : null}
              </a>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage("about")}
            className="inline-flex h-[56px] items-center rounded-[19px] px-7 text-[26px] font-normal leading-none text-white shadow-[0_6px_16px_rgba(128,94,255,0.3)] transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_14px_28px_rgba(128,94,255,0.36)] hover:opacity-95 active:translate-y-0 active:scale-[0.96]"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <span>Learn More</span>
            <img src={imgArrow} alt="" className="ml-3 h-[20px] w-[24px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
