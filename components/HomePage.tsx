"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SkillTag from "./SkillTag";
import RevealOnScroll from "./RevealOnScroll";
import { ArrowUpRight, Download, Github, Linkedin, Mail, Smartphone, RotateCw, Sparkles, Clock, Code2, Check, Facebook } from "lucide-react";
import { supabase } from "../lib/supabase";
import { queueWorksTechFilter } from "../lib/worksTechFilter";
import { motion, useReducedMotion } from "framer-motion";

// --- Types ---
interface HomePageProps {
  setCurrentPage: (page: string) => void;
  onOpenProjectDetails: (projectId: string) => void;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_featured?: boolean | null;
  category?: string | null;
  live_demo_url?: string;
  github_repo_url?: string;
  // Update this section:
  project_skills?: {
    tech_stack?: { skill_name?: string | null }[] | null; // Changed from object to array
  }[];
}

interface MilestoneData {
  id: string;
  label: string;
  value: string;
}

interface SpecializationData {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  sort_order: number;
}

interface FooterProfileData {
  name?: string;
  hero_title?: string;
  hero_sub_headline?: string;
  profile_image_url?: string;
  cv_download_url?: string;
  github_url?: string;
  linkedin_url?: string;
  email?: string;
  viber_number?: string;
  facebook_url?: string;
  instagram_url?: string;
}

type HomePageData = {
  projects: ProjectData[];
  milestones: MilestoneData[];
  specializations: SpecializationData[];
  profile: FooterProfileData | null;
};

const HOME_CACHE_KEY = "portfolio_home_cache_v3";

// --- Global Prefetch Utility ---
export async function prefetchHomePageData(): Promise<HomePageData | null> {
  try {
    const profileReq = supabase.from("profile").select("name, hero_title, hero_sub_headline, profile_image_url, cv_download_url, github_url, linkedin_url, email, viber_number, facebook_url, instagram_url").single();
    const projectsReq = supabase.from("projects").select("id, title, description, thumbnail_url, category, live_demo_url, github_repo_url, project_skills(tech_stack(skill_name))").eq('is_featured', true).order("created_at", { ascending: false });
    const milestonesReq = supabase.from("milestones").select("id, label, value");
    const specializationsReq = supabase.from("specializations").select("id, title, description, bullets, sort_order").eq("is_active", true).order("sort_order", { ascending: true });

    const [profileRes, projectsRes, milestonesRes, specRes] = await Promise.all([profileReq, projectsReq, milestonesReq, specializationsReq]);

    const freshData: HomePageData = {
      profile: profileRes.data || null,
      projects: projectsRes.data || [],
      milestones: milestonesRes.data || [],
      specializations: specRes.data || [],
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(freshData));
    }

    return freshData;
  } catch (error) {
    console.error("Failed to prefetch home data:", error);
    return null;
  }
}

// --- Skeleton Components ---
function HeroSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col-reverse items-center gap-12 lg:flex-row-reverse lg:justify-center lg:gap-20 w-full animate-pulse">
      {/* Photo panel placeholder */}
      <div className="aspect-square w-full max-w-[380px] shrink-0 rounded-[2rem] skeleton-box sm:max-w-[420px]" />

      {/* Text / terminal column placeholder */}
      <div className="flex w-full max-w-[720px] flex-col items-start gap-6 px-1">
        <div className="h-7 w-40 rounded-full skeleton-box" />
        <div className="flex flex-col gap-3 w-full">
          <div className="h-12 w-2/3 skeleton-box rounded-2xl sm:h-16" />
          <div className="h-12 w-1/2 skeleton-box rounded-2xl sm:h-16" />
        </div>
        <div className="h-14 w-full max-w-[560px] skeleton-box rounded-2xl" />
        <div className="flex w-full flex-row items-center gap-2 sm:w-auto sm:gap-4">
          <div className="h-12 w-40 shrink-0 skeleton-box rounded-2xl sm:h-14" />
          <div className="flex shrink-0 gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-10 rounded-xl skeleton-box sm:h-12 sm:w-12" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Terminal helpers (hero signature: a shell session that "types" your bio) ---
function useTypewriter(lines: string[], enabled: boolean, speed = 22, lineDelay = 400) {
  const [displayed, setDisplayed] = useState<string[]>(() => lines.map(() => ""));
  const [done, setDone] = useState(false);
  const reducedMotion = useReducedMotion();
  const linesKey = lines.join("|");

  useEffect(() => {
    if (!enabled) return;

    if (reducedMotion) {
      setDisplayed(lines);
      setDone(true);
      return;
    }

    let cancelled = false;
    setDisplayed(lines.map(() => ""));
    setDone(false);

    async function run() {
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        for (let ci = 1; ci <= line.length; ci++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, speed));
          setDisplayed((prev) => {
            const next = [...prev];
            next[li] = line.slice(0, ci);
            return next;
          });
        }
        await new Promise((r) => setTimeout(r, lineDelay));
      }
      if (!cancelled) setDone(true);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, linesKey, reducedMotion]);

  return { displayed, done };
}

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// --- Interactive Stacked Card Deck ---
interface StackDeckProps<T extends { id: string }> {
  items: T[];
  renderCard: (item: T, isTop: boolean) => React.ReactNode;
  ariaLabel: string;
  sizeClass?: string;
  accentColor: string;
  accentDotClass: string;
}

function InteractiveStackDeck<T extends { id: string }>({
  items,
  renderCard,
  ariaLabel,
  sizeClass = "w-[340px] h-[260px] max-w-full",
  accentColor,
  accentDotClass,
}: StackDeckProps<T>) {
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.id));

  useEffect(() => {
    setOrder((prev) => {
      const nextIds = items.map((i) => i.id);
      const prevSet = new Set(prev);
      const sameMembers = nextIds.length === prev.length && nextIds.every((id) => prevSet.has(id));
      return sameMembers ? prev : nextIds;
    });
  }, [items]);

  if (items.length === 0) return null;

  const itemById = new Map(items.map((i) => [i.id, i]));
  const visibleCount = Math.min(order.length, 4);
  const visibleIds = order.slice(0, visibleCount);
  const activeIndex = Math.max(0, items.findIndex((i) => i.id === order[0]));

  const cycleToBack = () => {
    setOrder((prev) => {
      if (prev.length < 2) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative mx-auto mb-10 ${sizeClass}`} role="group" aria-label={ariaLabel}>
        {visibleIds
          .map((id, idx) => ({ id, idx }))
          .reverse()
          .map(({ id, idx }) => {
            const item = itemById.get(id);
            if (!item) return null;
            const isTop = idx === 0;

            return (
              <motion.div
                key={id}
                role={isTop ? "button" : undefined}
                tabIndex={isTop ? 0 : -1}
                aria-label={isTop ? `${ariaLabel}: view next card` : undefined}
                onClick={isTop ? cycleToBack : undefined}
                onKeyDown={isTop ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cycleToBack(); } } : undefined}
                initial={false}
                animate={{
                  y: idx * 16,
                  x: idx * 10,
                  rotate: idx === 0 ? 0 : idx % 2 === 0 ? -1.5 : 1.75,
                  opacity: 1 - idx * 0.12,
                }}
                transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                style={{
                  zIndex: visibleCount - idx,
                  boxShadow: isTop ? `8px 8px 0px 0px ${accentColor}` : "4px 4px 0px 0px rgba(15,23,42,0.16)",
                  backfaceVisibility: "hidden",
                  WebkitFontSmoothing: "antialiased",
                }}
                whileTap={isTop ? { y: idx * 16 + 3 } : undefined}
                className={`absolute inset-0 flex flex-col overflow-hidden rounded-[1.5rem] border-2 border-black bg-white p-5 sm:p-6 font-sans will-change-transform ${isTop ? "cursor-pointer select-none" : "pointer-events-none"}`}
              >
                {renderCard(item, isTop)}
              </motion.div>
            );
          })}
      </div>

      {items.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {items.map((it, i) => (
            <span key={it.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? `${accentDotClass} w-6` : "w-1.5 bg-neutral-300"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function renderMilestoneCard(m: MilestoneData, isTop: boolean) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">// milestone</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0B0D10] text-[#A78BFA]">
          <Clock size={13} />
        </span>
      </div>
      <div className="flex flex-1 flex-col items-start justify-center gap-1">
        <p className="whitespace-nowrap text-4xl font-extrabold tracking-tight text-black sm:text-5xl">
          {m.value}
          <span className="cursor-blink text-[#A78BFA]">_</span>
        </p>
        <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.15em] text-secondary sm:text-sm">
          <span className="text-[#A78BFA]">&gt;</span> {m.label}
        </p>
      </div>
      {isTop && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400"><RotateCw size={12} /> tap --next</span>}
    </div>
  );
}

function renderSpecializationCard(spec: SpecializationData, isTop: boolean) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B0D10] text-[#A78BFA]">
          <Code2 size={16} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
          //{String(spec.sort_order ?? 0).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-bold tracking-tight text-black sm:text-xl">{spec.title}</h3>
      <p className="text-xs font-medium leading-relaxed text-secondary line-clamp-2 sm:text-sm">{spec.description}</p>
      <div className="flex-1" />
      {spec.bullets && spec.bullets.length > 0 && (
        <ul className="space-y-2 border-t-2 border-dashed border-neutral-200 pt-3 text-xs font-medium text-black sm:text-sm">
          {spec.bullets.slice(0, 3).map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <span className="font-bold text-[#A78BFA]">$</span>
              <span className="line-clamp-1">{b}</span>
            </li>
          ))}
        </ul>
      )}
      {isTop && <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400"><RotateCw size={12} /> tap --next</span>}
    </div>
  );
}

const BENTO_ROW_COLS = 3;
const BENTO_WIDTH_PATTERN = [1, 1, 1, 2, 1];

function getBentoWidth(index: number, total: number): number {
  let used = 0;
  for (let i = 0; i < index; i++) {
    used = (used + BENTO_WIDTH_PATTERN[i % BENTO_WIDTH_PATTERN.length]) % BENTO_ROW_COLS;
  }
  const isLast = index === total - 1;
  if (isLast) return used === 0 ? BENTO_ROW_COLS : BENTO_ROW_COLS - used;
  return BENTO_WIDTH_PATTERN[index % BENTO_WIDTH_PATTERN.length];
}

function getBentoSpanClass(index: number, total: number): string {
  const width = getBentoWidth(index, total);
  return width === 3 ? "sm:col-span-3" : width === 2 ? "sm:col-span-2" : "sm:col-span-1";
}

// --- Profile Avatar Fallback Config ---
const LOCAL_FALLBACK_AVATAR = "/assets/home/profile.jpg";
const AVATAR_TIMEOUT_MS = 2500;

export default function HomePage({ setCurrentPage, onOpenProjectDetails }: HomePageProps) {
  const [data, setData] = useState<HomePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Avatar fallback state ---
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [useFallbackAvatar, setUseFallbackAvatar] = useState(false);

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let isMounted = true;
    const cached = window.localStorage.getItem(HOME_CACHE_KEY);
    if (cached) {
      setData(JSON.parse(cached));
      setIsLoading(false);
    }
    prefetchHomePageData().then((freshData) => {
      if (isMounted && freshData) {
        const freshString = JSON.stringify(freshData);
        if (freshString !== cached) setData(freshData);
        if (!cached) setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const profile = data?.profile;
  const projects = data?.projects || [];
  const milestones = data?.milestones || [];
  const specializations = data?.specializations || [];

  // --- Avatar fallback: swap to local image if remote is slow or errors ---
  useEffect(() => {
    setAvatarLoaded(false);
    setUseFallbackAvatar(false);

    if (!profile?.profile_image_url) return;

    const timer = setTimeout(() => {
      setAvatarLoaded((loaded) => {
        if (!loaded) setUseFallbackAvatar(true);
        return loaded;
      });
    }, AVATAR_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [profile?.profile_image_url]);

  // --- Hero terminal: types out identity like a real shell session ---
  const heroReady = !isLoading && !!profile;
  const terminalRows = useMemo(
    () => [
      { cmd: "cat bio.md", out: profile?.hero_sub_headline || "" },
    ],
    [profile?.hero_sub_headline]
  );
  const { displayed: typedOutputs } = useTypewriter(
    terminalRows.map((r) => r.out),
    heroReady,
    22,
    400
  );

  function handleLinkInteraction(e: React.MouseEvent<HTMLAnchorElement>, rawValue?: string) {
    if (rawValue && navigator.clipboard && window.isSecureContext) {
      e.preventDefault();
      navigator.clipboard.writeText(rawValue).catch(() => {});
    }
  }

  const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemFadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } } };

  return (
    <div className="w-full overflow-hidden transition-opacity duration-700">
      {/* Signature motion: blinking cursors + pulse dots, disabled under prefers-reduced-motion */}
      <style jsx global>{`
        .cursor-blink {
          opacity: 1;
        }
        .pulse-dot {
          opacity: 1;
        }
        @media (prefers-reduced-motion: no-preference) {
          .cursor-blink {
            animation: blink-cursor 1s steps(1) infinite;
          }
          .pulse-dot {
            animation: pulse-dot 1.6s ease-in-out infinite;
          }
        }
        @keyframes blink-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.45); }
          50% { box-shadow: 0 0 0 4px rgba(167, 139, 250, 0); }
        }
      `}</style>

      <section className="w-full px-5 pb-16 pt-12 sm:px-6 md:px-10 lg:px-[70px] min-h-[80vh] flex items-center relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {isLoading ? <HeroSkeleton /> : (
          <div className="mx-auto flex max-w-[1280px] flex-col-reverse items-center gap-12 lg:flex-row-reverse lg:justify-center lg:gap-20 w-full">
            {/* Photo panel */}
            <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, type: "spring" as const }} className="relative flex aspect-square w-full max-w-[380px] shrink-0 flex-col overflow-hidden rounded-[2rem] border-2 border-black bg-white shadow-[10px_10px_0_0_#000] sm:max-w-[420px]">
              <motion.div animate={reducedMotion ? undefined : { y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }} className="h-full w-full flex flex-col">
                <div className="flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b-2 border-black bg-neutral-50 px-4">
                  <div className="flex items-center gap-2">
                    <span className="block h-3 w-3 rounded-full bg-[#ef655d]" /><span className="block h-3 w-3 rounded-full bg-[#e7bf45]" /><span className="block h-3 w-3 rounded-full bg-[#62bd58]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">profile.jpg</span>
                </div>
                <div className="relative m-1 flex-1 overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src={
                      useFallbackAvatar || !profile?.profile_image_url
                        ? LOCAL_FALLBACK_AVATAR
                        : profile.profile_image_url
                    }
                    alt={profile?.name || "Profile"}
                    className="h-full w-full object-cover"
                    onLoad={() => setAvatarLoaded(true)}
                    onError={() => setUseFallbackAvatar(true)}
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                    <span className="pulse-dot h-2 w-2 rounded-full bg-[#A78BFA]" /> open to work
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Text / terminal column */}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex w-full max-w-[720px] flex-col items-start gap-6 px-1">
              <motion.span variants={itemFadeUp} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-[3px_3px_0_0_#000]">
                system://portfolio
              </motion.span>

              <motion.h1 variants={itemFadeUp} className="text-black leading-[1.05] tracking-tight text-[2.75rem] sm:text-[3.5rem] lg:text-[4.5rem]">
                {profile?.hero_title} <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#7360F2] pb-2">{profile?.name}</span><span className="cursor-blink text-primary">_</span>
              </motion.h1>

              <motion.div variants={itemFadeUp} className="w-full max-w-[560px] rounded-2xl border-2 border-black bg-[#0B0D10] px-4 py-3 text-xs shadow-[6px_6px_0_0_#000] sm:text-sm" aria-hidden="true">
                {terminalRows.map((row, i) => (
                  <div key={row.cmd} className="mb-1.5 last:mb-0">
                    <p className="text-[#7C8894]"><span className="text-[#A78BFA]">$</span> {row.cmd}</p>
                    <p className="min-h-[1.25em] text-[#E8ECEF]">
                      {typedOutputs[i]}
                      {i === terminalRows.length - 1 && <span className="cursor-blink text-[#A78BFA]">▍</span>}
                    </p>
                  </div>
                ))}
              </motion.div>
              <span className="sr-only">{`${profile?.name || ""}. ${profile?.hero_sub_headline || ""}`}</span>

              <motion.div variants={itemFadeUp} className="mt-2 flex w-full flex-row items-center gap-2 sm:w-auto sm:gap-4">
                {profile?.cv_download_url && (
                   <motion.a whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} href={profile.cv_download_url} target="_blank" rel="noreferrer" className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-black bg-black px-4 text-sm font-bold tracking-wide text-white shadow-[4px_4px_0_0_#A78BFA] sm:h-14 sm:flex-none sm:px-8"><Download size={18} className="shrink-0" /> ./download-cv</motion.a>
                )}
                <div className="flex shrink-0 items-center gap-1 rounded-2xl border-2 border-black bg-white p-1 shadow-[4px_4px_0_0_#000] sm:gap-2">
                  {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition-all hover:bg-black hover:text-white sm:h-12 sm:w-12"><Github size={20} /></a>}
                  {profile?.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition-all hover:bg-[#0A66C2] hover:text-white sm:h-12 sm:w-12"><Linkedin size={20} /></a>}
                  {profile?.email && <a href={`mailto:${profile.email}`} onClick={(e) => handleLinkInteraction(e, profile.email)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition-all hover:bg-primary hover:text-white sm:h-12 sm:w-12"><Mail size={20} /></a>}
                  {profile?.facebook_url && <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition-all hover:bg-[#1877F2] hover:text-white sm:h-12 sm:w-12"><Facebook size={20} /></a>}
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </section>

      <RevealOnScroll threshold={0.15}>
        <section className="w-full px-4 py-16 sm:px-6 md:px-10 lg:px-[70px] bg-gradient-to-b from-violet-100/60 via-violet-50/40 to-transparent">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-10 flex items-end justify-between border-b-2 border-black pb-6">
              <div>
                <span className="mb-2 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-[#A78BFA]">$ ls ./competencies --sort=priority</span>
                <h2 className="text-black text-2xl md:text-3xl tracking-tight mb-2">Core Competencies</h2>
                <p className="text-secondary font-medium text-sm">The skills and strengths I bring to every project.</p>
              </div>
            </div>
            {isLoading ? <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14 animate-pulse"><div className="mx-auto h-[260px] w-[340px] max-w-full skeleton-box rounded-[1.5rem]" /><div className="mx-auto h-[260px] w-[340px] max-w-full skeleton-box rounded-[1.5rem]" /></div> : (
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10 lg:gap-14">
                <div className="flex flex-col items-center gap-1 text-center"><InteractiveStackDeck items={milestones} renderCard={renderMilestoneCard} ariaLabel="Milestones" accentColor="#7360F2" accentDotClass="bg-primary" /><h3 className="mt-5 text-xl font-bold text-primary tracking-tight">Milestones</h3><p className="text-sm font-medium text-primary/70">Numbers that tell the story so far.</p></div>
                <div className="flex flex-col items-center gap-1 text-center"><InteractiveStackDeck items={specializations} renderCard={renderSpecializationCard} ariaLabel="Specializations" accentColor="#7C3AED" accentDotClass="bg-violet-600" sizeClass="w-[340px] h-[300px] max-w-full" /><h3 className="mt-5 text-xl font-bold text-violet-700 tracking-tight">Specializations</h3><p className="text-sm font-medium text-violet-700/70">Where I focus my craft.</p></div>
              </div>
            )}
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll threshold={0.15}>
        <section className="w-full px-4 py-16 sm:px-6 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between border-b-2 border-black pb-6">
              <div>
                <span className="mb-2 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-[#A78BFA]">$ git log --featured --projects</span>
                <h2 className="text-black text-3xl md:text-4xl tracking-tight mb-2">Featured Works</h2>
                <p className="text-secondary font-medium text-sm">A selection of my latest technical projects.</p>
              </div>
              <button 
                onClick={() => setCurrentPage("works")} 
                className="group flex w-fit whitespace-nowrap items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-wider text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#000]"
              >
                view --all 
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-neutral-100 group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowUpRight size={14} />
                </span>
              </button>
            </div>
            {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-3 auto-rows-[240px] sm:auto-rows-[260px] gap-6">{[0,1,2,3,4].map((idx) => <div key={idx} className={`w-full rounded-[2rem] skeleton-box ${getBentoSpanClass(idx, 5)}`} />)}</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-3 auto-rows-[300px] sm:auto-rows-[260px] gap-6">
                {projects.map((project, idx) => {
                  const spanClass = getBentoSpanClass(idx, projects.length);
                  const isBig = getBentoWidth(idx, projects.length) >= 2;
                  return (
                    <motion.article key={project.id} whileHover="hover" onClick={() => onOpenProjectDetails(project.id)} className={`relative w-full h-full rounded-[2rem] overflow-hidden cursor-pointer group bg-neutral-100 border-2 border-black shadow-[6px_6px_0_0_#000] transition-shadow hover:shadow-[3px_3px_0_0_#000] ${spanClass}`}>
                      {project.thumbnail_url ? <motion.img variants={{ hover: { scale: 1.05 } }} transition={{ duration: 0.6, ease: "easeOut" as const }} src={project.thumbnail_url} alt={project.title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-neutral-300"><span className="font-medium text-lg">No Preview Available</span></div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

                      <motion.div variants={{ hover: { y: 0 } }} initial={{ y: 10 }} transition={{ duration: 0.4, type: "spring" as const, stiffness: 100 }} className="absolute inset-x-4 bottom-4 md:inset-x-6 md:bottom-6 max-h-[calc(100%-2rem)] md:max-h-[calc(100%-3rem)] overflow-hidden p-4 md:p-6 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col">
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <h3 className={`font-bold text-white drop-shadow-sm line-clamp-2 ${isBig ? "text-xl md:text-2xl lg:text-3xl" : "text-base md:text-lg"}`}>{project.title}</h3>
                          <div className="h-9 w-9 md:h-10 md:w-10 shrink-0 bg-white text-black rounded-full flex items-center justify-center transform -translate-y-2 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"><ArrowUpRight size={18} /></div>
                        </div>
                        <p className="mb-3 text-[11px] text-white/50">~/projects/{toSlug(project.title)}</p>
                        <p className={`text-sm font-medium leading-relaxed text-white/80 mb-4 ${isBig ? "line-clamp-2" : "line-clamp-1"}`}>{project.description}</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {project.project_skills?.slice(0, isBig ? 3 : 2).map((skill, skillIdx) => {
                            // Update this line to access the first item of the tech_stack array:
                            const name = skill.tech_stack?.[0]?.skill_name; 
                            if (!name) return null;
                            return (
                              <button 
                                key={`${project.id}-${name}-${skillIdx}`} 
                                onClick={(e) => { e.stopPropagation(); queueWorksTechFilter(name); setCurrentPage("works"); }} 
                                className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-2 py-1 text-[11px] font-medium text-[#DDD6FE] transition-colors hover:bg-[#A78BFA] hover:text-black"
                              >
                                {`+${name}`}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </RevealOnScroll>
    </div>
  );
}