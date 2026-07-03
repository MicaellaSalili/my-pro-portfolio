"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RevealOnScroll from "./RevealOnScroll";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type ContactProfileData = {
  name?: string | null;
  email?: string | null;
  viber_number?: string | null;
  phone_number?: string | null;
  facebook_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  location?: string | null;
  contact_title?: string | null;
  contact_subtitle?: string | null;
  contact_intro?: string | null;
  about_summary?: string | null;
  hero_sub_headline?: string | null;
};

type ContactInfoItem = {
  id: string;
  label: string;
  href: string;
  iconSrc: string;
  iconOverlaySrc?: string;
  rawValue?: string;
};

const iconEmail = "/assets/hero/icon-email.svg";
const iconEmailOverlay = "/assets/hero/icon-email-overlay.svg";
const iconViber = "/assets/hero/icon-viber.svg";
const iconGithub = "/assets/hero/icon-github.svg";
const iconLinkedin = "/assets/hero/icon-linkedin.svg";
const iconFacebook = "/assets/hero/icon-facebook.svg";
const iconInstagram = "/assets/hero/icon-instagram.svg";

let contactPageProfileCache: ContactProfileData | null = null;
let contactPagePending: Promise<ContactProfileData | null> | null = null;

async function fetchContactProfileData(): Promise<ContactProfileData | null> {
  const { data } = await supabase.from("profile").select("*").limit(1).maybeSingle();
  return (data as ContactProfileData | null) || null;
}

export function prefetchContactPageData(): Promise<ContactProfileData | null> {
  if (contactPageProfileCache) {
    return Promise.resolve(contactPageProfileCache);
  }

  if (contactPagePending) {
    return contactPagePending;
  }

  const request = (async () => {
    try {
      const profileData = await fetchContactProfileData();
      if (profileData) {
        contactPageProfileCache = profileData;
      }
      return profileData;
    } finally {
      contactPagePending = null;
    }
  })();

  contactPagePending = request;
  return request;
}

function getContactTitle(profile: ContactProfileData | null) {
  const contactTitle = profile?.contact_title?.trim();
  if (contactTitle) {
    return contactTitle;
  }
  const fallbackTitle = profile?.contact_subtitle?.trim();
  if (fallbackTitle) {
    return fallbackTitle;
  }
  return "Let’s Talk";
}

export default function ContactPage() {
  const [profile, setProfile] = useState<ContactProfileData | null>(contactPageProfileCache);
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [showLeftColumn, setShowLeftColumn] = useState(false);
  const [showFormCard, setShowFormCard] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const leftColumnRef = useRef<HTMLElement | null>(null);
  const formCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isUnmounted = false;
    async function fetchContactProfile() {
      const cachedProfile = contactPageProfileCache;
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
      const profileData = await prefetchContactPageData();
      if (!isUnmounted) {
        setProfile(profileData);
      }
    }
    void fetchContactProfile();
    return () => { isUnmounted = true; };
  }, []);

  const contactItems = useMemo<ContactInfoItem[]>(() => {
    const emailAddress = profile?.email?.trim() || "";
    const mobileRaw = (profile?.phone_number || profile?.viber_number || "").trim();
    const mobileNormalized = mobileRaw.replace(/[^\d+]/g, "");
    const mobileHref = mobileNormalized ? `tel:${mobileNormalized}` : "";

    return [
      { id: "email", label: "Email", href: emailAddress ? `mailto:${emailAddress}` : "", iconSrc: iconEmail, iconOverlaySrc: iconEmailOverlay, rawValue: emailAddress },
      { id: "mobile", label: "Mobile", href: mobileHref, iconSrc: iconViber, rawValue: mobileRaw },
      { id: "github", label: "Github", href: profile?.github_url || "", iconSrc: iconGithub },
      { id: "linkedin", label: "LinkedIn", href: profile?.linkedin_url || "", iconSrc: iconLinkedin },
      { id: "facebook", label: "Facebook", href: profile?.facebook_url || "", iconSrc: iconFacebook },
      { id: "instagram", label: "Instagram", href: profile?.instagram_url || "", iconSrc: iconInstagram },
    ].filter((item) => item.href);
  }, [profile]);

  const title = getContactTitle(profile);
  const [titleStart, titleAccent] = title.split(/\s+(?=[^\s]+$)/);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const animateKey = (entry.target as HTMLElement).dataset.animate;
          if (animateKey === "left") setShowLeftColumn(true);
          if (animateKey === "form") setShowFormCard(true);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    const leftElement = leftColumnRef.current;
    const formElement = formCardRef.current;
    if (leftElement) observer.observe(leftElement);
    if (formElement) observer.observe(formElement);
    return () => { observer.disconnect(); };
  }, []);

  const handleLinkInteraction = (e: React.MouseEvent<HTMLAnchorElement>, item: ContactInfoItem) => {
    if ((item.id === "email" || item.id === "mobile") && item.rawValue) {
      navigator.clipboard.writeText(item.rawValue).then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName || !contactEmail || !subject || !message) {
      setSubmitState("error");
      return;
    }
    setSubmitState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, contactEmail, subject, message }),
      });
      if (!response.ok) throw new Error();
      setSubmitState("success");
      setFullName(""); setContactEmail(""); setSubject(""); setMessage("");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <section className="w-full bg-transparent px-6 pt-2 pb-12 lg:px-12 xl:px-20">
      <div className="mx-auto w-full max-w-[1440px]">
        <RevealOnScroll threshold={0.2}>
          <div className="mx-auto max-w-[1240px]">
            <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_560px] lg:items-start xl:gap-16">
              <aside
                ref={leftColumnRef}
                data-animate="left"
                className={`w-full transition-all duration-700 ${showLeftColumn ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
              >
                <h2 className="text-[38px] font-bold tracking-tight text-neutral-900 md:text-[44px] leading-none mb-4">
                  {titleAccent ? <>{titleStart} <span className="text-[#997dfa]">{titleAccent}</span></> : title}
                </h2>
                <div className="w-full grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-[400px]">
                  {contactItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target={!item.href.startsWith("mailto:") ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={(e) => handleLinkInteraction(e, item)}
                      className="group flex items-center justify-between rounded-xl bg-white/70 backdrop-blur-sm px-4 py-2.5 border border-neutral-100 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:border-neutral-200/60 hover:shadow-md active:translate-y-0 cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="relative inline-flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-neutral-100/70">
                          <img src={item.iconSrc} alt="" className="size-5 object-contain" />
                          {item.iconOverlaySrc && <img src={item.iconOverlaySrc} alt="" className="absolute size-2.5 object-contain" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-wide text-neutral-700 transition-colors duration-200 group-hover:text-black truncate">{item.label}</p>
                          {copiedId === item.id && <span className="text-[10px] font-bold text-[#997dfa] block mt-0.5 animate-fade-in">Copied!</span>}
                        </div>
                      </div>
                      <span className="text-neutral-400 shrink-0 transition-all duration-200 group-hover:text-[#997dfa] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ml-2"><ArrowUpRight size={16} /></span>
                    </a>
                  ))}
                </div>
              </aside>

              <article
                ref={formCardRef}
                data-animate="form"
                className={`w-full max-w-[560px] rounded-[50px] bg-white p-6 shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] transition-all duration-700 sm:p-8 lg:p-[32px] ${showFormCard ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
              >
                <div className="mb-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex size-3 rounded-full bg-[#e66b64]" /><span className="inline-flex size-3 rounded-full bg-[#dfb343]" /><span className="inline-flex size-3 rounded-full bg-[#61c554]" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-[42px] items-center justify-center rounded-[20px] bg-primary text-white"><MessageCircle size={20} /></span>
                    <h3 className="text-[20px] font-bold uppercase tracking-[0.2em] text-black">Send A Message</h3>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1"><span className="block text-[12px] font-bold uppercase text-secondary">Identity</span><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Full Name" className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 text-[12px] font-bold text-secondary outline-none focus:border-primary" /></label>
                    <label className="space-y-1"><span className="block text-[12px] font-bold uppercase text-secondary">Contact Email</span><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 text-[12px] font-bold text-secondary outline-none focus:border-primary" /></label>
                  </div>
                  <label className="block space-y-1"><span className="block text-[12px] font-bold uppercase text-secondary">Subject Of Interest</span><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. System Redesign" className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 text-[12px] font-bold text-secondary outline-none focus:border-primary" /></label>
                  <label className="mt-4 block space-y-1"><span className="block text-[12px] font-bold uppercase text-secondary">Message</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Briefly describe your vision........." className="h-[117px] w-full resize-none rounded-[30px] border border-[#b4b4b4] bg-white px-3 py-2 text-[12px] font-bold text-secondary outline-none focus:border-primary" /></label>
                  <button type="submit" disabled={submitState === "sending"} className="inline-flex h-[50px] w-full items-center justify-center rounded-[30px] bg-primary px-4 text-[14px] font-black text-white hover:opacity-95 disabled:opacity-60">{submitState === "sending" ? "Sending..." : "Dispatch Message"}</button>
                  {submitState === "success" && <p className="text-center text-[12px] font-semibold text-primary">Message sent successfully.</p>}
                  {submitState === "error" && <p className="text-center text-[12px] font-semibold text-[#B44F4F]">Unable to send message.</p>}
                </form>
              </article>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}