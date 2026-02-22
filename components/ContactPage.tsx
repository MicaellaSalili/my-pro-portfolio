"use client";

import { useEffect, useMemo, useState } from "react";
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
};

const iconEmail = "/assets/hero/icon-email.svg";
const iconEmailOverlay = "/assets/hero/icon-email-overlay.svg";
const iconViber = "/assets/hero/icon-viber.svg";
const iconGithub = "/assets/hero/icon-github.svg";
const iconLinkedin = "/assets/hero/icon-linkedin.svg";
const iconFacebook = "/assets/hero/icon-facebook.svg";
const iconInstagram = "/assets/hero/icon-instagram.svg";

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

function getIntroText(profile: ContactProfileData | null) {
  return (
    profile?.contact_intro?.trim() ||
    profile?.hero_sub_headline?.trim() ||
    profile?.about_summary?.trim() ||
    ""
  );
}

export default function ContactPage() {
  const [profile, setProfile] = useState<ContactProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    async function fetchContactProfile() {
      const { data } = await supabase.from("profile").select("*").limit(1).maybeSingle();
      if (data) {
        setProfile(data as ContactProfileData);
      }
    }

    fetchContactProfile();
  }, []);

  const contactItems = useMemo<ContactInfoItem[]>(() => {
    const viberHref = profile?.viber_number
      ? `viber://chat?number=${encodeURIComponent(profile.viber_number)}`
      : "";

    return [
      {
        id: "email",
        label: "Email",
        href: profile?.email ? `mailto:${profile.email}` : "",
        iconSrc: iconEmail,
        iconOverlaySrc: iconEmailOverlay,
      },
      {
        id: "mobile",
        label: "Mobile Phone",
        href: viberHref,
        iconSrc: iconViber,
      },
      {
        id: "github",
        label: "Github",
        href: profile?.github_url || "",
        iconSrc: iconGithub,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        href: profile?.linkedin_url || "",
        iconSrc: iconLinkedin,
      },
      {
        id: "facebook",
        label: "Facebook",
        href: profile?.facebook_url || "",
        iconSrc: iconFacebook,
      },
      {
        id: "instagram",
        label: "Instagram",
        href: profile?.instagram_url || "",
        iconSrc: iconInstagram,
      },
    ].filter((item) => item.href);
  }, [profile]);

  const title = getContactTitle(profile);
  const [titleStart, titleAccent] = title.split(/\s+(?=[^\s]+$)/);
  const introText = getIntroText(profile);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName || !contactEmail || !subject || !message) {
      setSubmitState("error");
      return;
    }

    setSubmitState("sending");

    const { error } = await supabase.from("contact_messages").insert({
      name: fullName,
      email: contactEmail,
      subject,
      message,
    });

    if (error) {
      setSubmitState("error");
      return;
    }

    setSubmitState("success");
    setFullName("");
    setContactEmail("");
    setSubject("");
    setMessage("");
  }

  return (
    <section className="w-full bg-transparent px-5 py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,white)] px-4 py-2 text-[20px] font-bold uppercase leading-none text-primary">
            <span className="inline-flex size-6 items-center justify-center rounded-[8px] border border-primary text-[14px]">◔</span>
            <span>Contact Me</span>
          </div>

          <h2 className="text-[64px] font-bold leading-none text-black">
            {titleAccent ? (
              <>
                {titleStart}{" "}
                <span className="text-primary">{titleAccent}</span>
              </>
            ) : (
              title
            )}
          </h2>

          {introText ? (
            <p className="mt-4 max-w-[650px] text-[24px] leading-[1.2] text-secondary">{introText}</p>
          ) : null}

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
            <aside className="w-full max-w-[420px]">
              <p className="mb-6 text-[20px] font-bold uppercase tracking-[0.2em] text-black">Connection Hub</p>

              <div className="space-y-4">
                {contactItems.map((item) => (
                  <article key={item.id} className="flex items-center gap-3 rounded-[10px] bg-[rgba(246,246,246,0.9)] px-3 py-2">
                    <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
                      <img src={item.iconSrc} alt="" className="h-11 w-11 object-contain" />
                      {item.iconOverlaySrc ? (
                        <img src={item.iconOverlaySrc} alt="" className="absolute h-5 w-5 object-contain" />
                      ) : null}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[35px] font-bold leading-none text-black">{item.label}</p>
                    </div>

                    {item.href ? (
                      <a
                        href={item.href}
                        target={!item.href.startsWith("mailto:") && !item.href.startsWith("viber:") ? "_blank" : undefined}
                        rel={!item.href.startsWith("mailto:") && !item.href.startsWith("viber:") ? "noreferrer" : undefined}
                        className="text-[30px] font-medium text-secondary transition-colors hover:text-primary"
                        aria-label={`Open ${item.label}`}
                      >
                        ↗
                      </a>
                    ) : (
                      <span className="text-[26px] text-secondary/50">↗</span>
                    )}
                  </article>
                ))}
              </div>
            </aside>

            <article className="w-full max-w-[560px] rounded-[50px] bg-white p-8 shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] sm:p-9 lg:justify-self-end lg:self-start lg:p-[36px]">
              <div className="mb-8">
                <div className="mb-6 flex items-center gap-2">
                  <span className="inline-flex size-3 rounded-full bg-[#e66b64]" />
                  <span className="inline-flex size-3 rounded-full bg-[#dfb343]" />
                  <span className="inline-flex size-3 rounded-full bg-[#61c554]" />
                </div>

                <div className="flex items-center gap-4">
                  <span className="inline-flex size-[42px] items-center justify-center rounded-[20px] bg-primary text-[18px] text-white">◔</span>
                  <h3 className="text-[20px] font-bold uppercase tracking-[0.2em] text-black">Send A Message</h3>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-[12px] font-bold uppercase text-secondary">Identity</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your Full Name"
                      className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 text-[12px] font-bold text-secondary outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-[12px] font-bold uppercase text-secondary">Contact Email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="email@example.com"
                      className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 text-[12px] font-bold text-secondary outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="block text-[12px] font-bold uppercase text-secondary">Subject Of Interest</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. System Redesign or Project Inquiry"
                    className="h-[39px] w-full rounded-[10px] border border-[#b4b4b4] bg-white px-3 py-2 text-[12px] font-bold text-secondary outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="mt-6 space-y-2">
                  <span className="block text-[12px] font-bold uppercase text-secondary">Message</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Briefly describe your vision........."
                    className="h-[117px] w-full resize-none rounded-[30px] border border-[#b4b4b4] bg-white px-3 py-2 text-[12px] font-bold text-secondary outline-none transition-colors focus:border-primary"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitState === "sending"}
                  className="inline-flex h-[50px] w-full items-center justify-center rounded-[30px] bg-primary px-4 text-[14px] font-black text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitState === "sending" ? "Sending..." : "Dispatch Message"}
                </button>

                {submitState === "success" ? (
                  <p className="text-center text-[12px] font-semibold text-primary">Message sent successfully.</p>
                ) : null}

                {submitState === "error" ? (
                  <p className="text-center text-[12px] font-semibold text-[#B44F4F]">Unable to send your message. Please check your inputs and try again.</p>
                ) : null}
              </form>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}