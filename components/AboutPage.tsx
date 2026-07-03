"use client";

import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { PageContext } from "./RootLayoutClient";
import { queueWorksTechFilter } from "../lib/worksTechFilter";
import { ABOUT_SECTION_EVENT, ABOUT_SECTION_STORAGE_KEY } from "../lib/aboutSectionNav";
import SkillTag from "./SkillTag";
import { Download, ArrowUpRight } from "lucide-react";

const sidebarItems = [
  { id: "profile", label: "Profile" },
  { id: "credentials", label: "Credentials" },
  { id: "experience", label: "Experience" },
  { id: "tech-stacks", label: "Tech Stacks" },
  { id: "specializations", label: "Specializations" },
];

const toolGroups = [
  { title: "PROGRAMMING & LANGUAGES", dark: true },
  { title: "FRAMEWORK & LIBRARIES", dark: false },
  { title: "DATABASE & SERVICES", dark: true },
  { title: "TOOLS & PLATFORMS", dark: false },
];

const ABOUT_PAGE_CACHE_KEY = "about_page_cache_v3";

// --- Framer Motion variants (additive animation layer; existing
// IntersectionObserver-driven reveal classes on sections are left in
// place untouched, these variants animate the items *within* each
// section so lists/grids get a nice staggered entrance too). ---
const fadeUpItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut", delay: Math.min(i, 8) * 0.06 },
  }),
};

const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const modalPanelVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease: "easeIn" } },
};

type ProfileData = {
  name: string | null;
  about_summary: string | null;
  resume_download_url: string | null;
  cv_download_url: string | null;
};

type EducationData = {
  degree: string | null;
  school: string | null;
  period: string | null;
  elective: string | null;
  sort_order: number | null;
};

type CertificationData = {
  name: string | null;
  issuer: string | null;
  date_earned: string | null;
  credential_url: string | null;
};

type ExperienceData = {
  id: string;
  role: string | null;
  company: string | null;
  location: string | null;
  period: string | null;
  description: string | null;
  sort_order: number | null;
  proof_url: string | null;
};

type TechStackData = {
  id: string;
  category: string | null;
  skill_name: string | null;
};

type ExperienceSkillData = {
  experience_id: string;
  skill_id: string;
  tech_stack?: {
    skill_name?: string | null;
  } | null;
};

type MilestoneData = {
  label: string | null;
  value: string | null;
};

type SpecializationData = {
  id: string;
  title: string;
  description: string;
};

type ExperienceWithSkills = {
  id: string;
  role: string;
  company: string;
  location: string;
  date: string;
  summary: string;
  proofUrl: string | null;
  skills: string[];
};

type ToolGroupData = {
  title: string;
  dark: boolean;
  items: string[];
};

type AboutPageCacheData = {
  profile: ProfileData | null;
  education: EducationData[];
  certificationList: CertificationData[];
  experienceList: ExperienceWithSkills[];
  toolSkills: TechStackData[];
  specializationList: SpecializationData[];
  milestones: MilestoneData[];
};

// --- Global Prefetch Utility ---
// Cache-First Fetching Architecture (matches HomePage.tsx): the page reads
// localStorage synchronously on mount for an instant paint, then this
// function hits Supabase in the background; state is only patched in if the
// fresh payload actually differs from what was cached. Only the columns
// actually rendered on this page are selected, keeping each payload small.
export async function prefetchAboutPageData(): Promise<AboutPageCacheData | null> {
  try {
    const profileReq = supabase
      .from("profile")
      .select("name, about_summary, resume_download_url, cv_download_url")
      .limit(1)
      .maybeSingle();
    const educationReq = supabase
      .from("education")
      .select("degree, school, period, elective, sort_order")
      .order("sort_order", { ascending: true });
    const certificationsReq = supabase
      .from("certifications")
      .select("name, issuer, date_earned, credential_url");
    const experienceReq = supabase
      .from("experience")
      .select("id, role, company, location, period, description, sort_order, proof_url")
      .order("sort_order", { ascending: true });
    const techStackReq = supabase
      .from("tech_stack")
      .select("id, category, skill_name");
    const experienceSkillsReq = supabase
      .from("experience_skills")
      .select("experience_id, skill_id, tech_stack(skill_name)");
    const specializationsReq = supabase
      .from("specializations")
      .select("id, title, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const projectCountReq = supabase.from("projects").select("id", { count: "exact", head: true });
    const milestonesReq = supabase.from("milestones").select("label, value");

    const [
      profileResult,
      educationResult,
      certificationsResult,
      experienceResult,
      techStackResult,
      experienceSkillsResult,
      specializationsResult,
      projectCountResult,
      milestonesResult,
    ] = await Promise.all([
      profileReq,
      educationReq,
      certificationsReq,
      experienceReq,
      techStackReq,
      experienceSkillsReq,
      specializationsReq,
      projectCountReq,
      milestonesReq,
    ]);

    const profileData = (profileResult.data as ProfileData | null) || null;
    const educationData = (educationResult.data as EducationData[]) || [];
    const certificationsData = (certificationsResult.data as CertificationData[]) || [];
    const experiencesData = (experienceResult.data || []) as ExperienceData[];
    const experienceSkills = (experienceSkillsResult.data || []) as ExperienceSkillData[];
    const techStackData = (techStackResult.data || []) as TechStackData[];
    const specializationsData = (specializationsResult.data || []) as SpecializationData[];

    const skillByExperience = new Map<string, string[]>();
    experienceSkills.forEach((row) => {
      const skill = row.tech_stack?.skill_name?.trim() || "";
      if (!skill) return;
      const current = skillByExperience.get(row.experience_id) || [];
      current.push(skill);
      skillByExperience.set(row.experience_id, current);
    });

    const mappedExperience: ExperienceWithSkills[] = experiencesData.map((item) => ({
      id: item.id,
      role: item.role || "",
      company: item.company || "",
      location: item.location || "",
      date: item.period || "",
      summary: item.description || "",
      proofUrl: item.proof_url,
      skills: skillByExperience.get(item.id) || [],
    }));

    const projectCount = projectCountResult.count || 0;
    const rawMilestones = ((milestonesResult.data || []) as MilestoneData[]).filter(
      (item) => (item.label || "").trim() || (item.value || "").trim()
    );

    const fallbackMilestones: MilestoneData[] = rawMilestones.length
      ? rawMilestones
      : [
          { label: "Experience", value: `${experiencesData.length}` },
          { label: "Projects", value: `${projectCount}` },
        ];

    const freshData: AboutPageCacheData = {
      profile: profileData,
      education: educationData,
      certificationList: certificationsData,
      experienceList: mappedExperience,
      toolSkills: techStackData,
      specializationList: specializationsData,
      milestones: fallbackMilestones,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ABOUT_PAGE_CACHE_KEY, JSON.stringify(freshData));
    }

    return freshData;
  } catch (error) {
    console.error("Failed to prefetch about data:", error);
    return null;
  }
}

function isSupabaseUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return (
      hostname.endsWith(".supabase.co") ||
      hostname.endsWith(".supabase.in")
    );
  } catch {
    return false;
  }
}

function normalizeToolCategory(value: string | null) {
  const category = (value || "").toLowerCase().trim();

  // 1. DATABASE & SERVICES
  if (
    category.includes("database") ||
    category.includes("services")
  ) {
    return "DATABASE & SERVICES";
  }

  // 2. FRAMEWORK & LIBRARIES
  if (
    category.includes("framework") ||
    category.includes("library") ||
    category.includes("libraries")
  ) {
    return "FRAMEWORK & LIBRARIES";
  }

  // 3. PROGRAMMING & LANGUAGES
  if (
    category.includes("programming") ||
    category.includes("programming language") ||
    category.includes("programming languages") ||
    category.includes("language") ||
    category.includes("languages")
  ) {
    return "PROGRAMMING & LANGUAGES";
  }

  // 4. Fallback default: TOOLS & PLATFORMS
  // (Safely groups inputs matching "tools", "platforms", or anything else)
  return "TOOLS & PLATFORMS";
}

function SectionBadge({ label }: { label: string }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
      <span className="text-[14px] leading-none">◔</span>
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bento primitives
//
// Every card on the page (milestones, credentials, experience, tools,
// specializations) shares this same glass surface + hover-glow grammar, so
// the "bento grid" reads as one cohesive system rather than several
// unrelated card styles bolted together.
// ---------------------------------------------------------------------------

function BentoCard({
  children,
  className = "",
  dark = false,
  glow = true,
  as: Tag = "article",
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  glow?: boolean;
  as?: "article" | "div";
}) {
  return (
    <Tag className={`group relative ${className}`}>
      {glow ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1px] rounded-[inherit] bg-gradient-to-br from-primary/30 via-primary/5 to-transparent opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100"
        />
      ) : null}
      <div
        className={`relative flex h-full flex-col rounded-3xl border backdrop-blur-xl transition-all duration-300 ease-out group-hover:-translate-y-1 ${
          dark
            ? "border-neutral-800/60 bg-neutral-900/90 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.55)] group-hover:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.6)]"
            : "border-neutral-200/50 bg-white/70 shadow-[0_10px_36px_-18px_rgba(15,15,15,0.14)] group-hover:border-primary/25 group-hover:bg-white/85 group-hover:shadow-[0_24px_50px_-20px_rgba(15,15,15,0.22)]"
        }`}
      >
        {children}
      </div>
    </Tag>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-neutral-200/70 ${className}`} />;
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-neutral-200/50 bg-white/60 backdrop-blur-xl ${className}`}
    />
  );
}

export default function AboutPage() {
  const pageContext = useContext(PageContext);
  const pageRef = useRef<HTMLElement | null>(null);
  const scrollTabsRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<AboutPageCacheData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState(sidebarItems[0].id);
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null);

  // Cache-First Fetching Architecture (same pattern as HomePage.tsx):
  // read localStorage synchronously on mount so the page paints instantly
  // for a returning visitor, then revalidate against Supabase in the
  // background and only swap in the fresh payload if it actually changed.
  useEffect(() => {
    let isMounted = true;

    const cached = window.localStorage.getItem(ABOUT_PAGE_CACHE_KEY);
    if (cached) {
      setData(JSON.parse(cached));
      setIsLoading(false);
    }

    prefetchAboutPageData().then((freshData) => {
      if (isMounted && freshData) {
        const freshString = JSON.stringify(freshData);
        if (freshString !== cached) {
          setData(freshData);
        }
        if (!cached) setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, []);

  const profile = data?.profile || null;
  const education = data?.education || [];
  const certificationList = data?.certificationList || [];
  const experienceList = data?.experienceList || [];
  const toolSkills = data?.toolSkills || [];
  const specializationList = data?.specializationList || [];
  const milestones = data?.milestones || [];

  const aboutSummary = profile?.about_summary?.trim() || "";
  const displayAboutSummary = aboutSummary || "No about summary yet.";
  const aboutParagraphs = (aboutSummary || "")
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const groupedTools = useMemo<ToolGroupData[]>(() => {
    const groups = new Map<string, string[]>();
    toolGroups.forEach((group) => groups.set(group.title, []));
    toolSkills.forEach((item) => {
      if (!item.skill_name) return;
      const groupKey = normalizeToolCategory(item.category);
      const current = groups.get(groupKey) || [];
      current.push(item.skill_name);
      groups.set(groupKey, current);
    });
    return toolGroups.map((group) => ({
      ...group,
      items: groups.get(group.title) || [],
    }));
  }, [toolSkills]);

  function goToSection(sectionId: string, smooth = true) {
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) return false;
    setActiveSidebarItem(sectionId);
    sectionElement.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    const activeBtn = document.getElementById(`tab-${sectionId}`);
    if (activeBtn && scrollTabsRef.current) {
      const container = scrollTabsRef.current;
      const leftOffset = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
      container.scrollTo({ left: leftOffset, behavior: "smooth" });
    }
    return true;
  }

  useEffect(() => {
    const pendingSection = window.localStorage.getItem(ABOUT_SECTION_STORAGE_KEY) || "";
    if (pendingSection.trim()) {
      requestAnimationFrame(() => {
        goToSection(pendingSection, true);
        window.localStorage.removeItem(ABOUT_SECTION_STORAGE_KEY);
      });
    }

    const handleAboutSectionNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ sectionId?: string }>;
      const targetSectionId = customEvent.detail?.sectionId || "";
      if (!targetSectionId.trim()) return;
      goToSection(targetSectionId, true);
    };

    window.addEventListener(ABOUT_SECTION_EVENT, handleAboutSectionNavigate as EventListener);
    return () => {
      window.removeEventListener(ABOUT_SECTION_EVENT, handleAboutSectionNavigate as EventListener);
    };
  }, []);

  function handleSkillTagClick(skill: string) {
    queueWorksTechFilter(skill);
    pageContext?.setCurrentPage("works");
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibleEntries.length > 0) {
          const matchingId = visibleEntries[0].target.id;
          setActiveSidebarItem(matchingId);
          const activeBtn = document.getElementById(`tab-${matchingId}`);
          if (activeBtn && scrollTabsRef.current) {
            const container = scrollTabsRef.current;
            const leftOffset = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
            container.scrollLeft = leftOffset;
          }
        }
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] }
    );

    sidebarItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const rootElement = pageRef.current;
    if (!rootElement) return;

    const revealElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>("[data-about-reveal]")
    );
    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.remove("opacity-0", "translate-y-5");
          target.classList.add("opacity-100", "translate-y-0");
          observer.unobserve(target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [experienceList.length, certificationList.length, groupedTools.length, specializationList.length, isLoading]);

  useEffect(() => {
    const rootElement = pageRef.current;
    if (!rootElement) return;
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  return (
    <section ref={pageRef} className="w-full bg-transparent px-4 pt-1 pb-12 sm:px-6 lg:px-12 xl:px-20">

      {/* Mobile Swipe Segment Tabs */}
      <div className="sticky top-0 z-50 -mx-4 mb-6 border-b border-neutral-200/50 bg-white/75 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div
          ref={scrollTabsRef}
          className="hide-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth"
        >
          {sidebarItems.map((item) => (
            <button
              key={`tab-item-${item.id}`}
              id={`tab-${item.id}`}
              type="button"
              onClick={() => goToSection(item.id, true)}
              className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold tracking-wide transition-all duration-200 ${
                activeSidebarItem === item.id
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "border border-neutral-200/60 bg-neutral-50/80 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-12 lg:flex-row lg:gap-16">

        {/* Desktop Sticky Sidebar */}
        <aside
          data-about-reveal
          className="hidden w-full max-w-[240px] shrink-0 translate-y-5 self-start opacity-0 transition-all duration-700 ease-out lg:sticky lg:top-24 lg:block"
        >
          <h2 className="mb-6 text-[28px] font-extrabold tracking-tighter text-neutral-900">About</h2>
          <motion.ul
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={staggerContainerVariants}
          >
            {sidebarItems.map((item, index) => (
              <motion.li key={item.id} custom={index} variants={fadeUpItemVariants}>
                <motion.button
                  type="button"
                  onClick={() => goToSection(item.id, true)}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  className={`h-11 w-full rounded-xl border px-4 text-left text-sm transition-all duration-200 ${
                    activeSidebarItem === item.id
                      ? "border-primary bg-primary text-white font-bold shadow-md shadow-primary/20 active:translate-y-[1px]"
                      : "border-neutral-200/70 bg-transparent font-semibold text-neutral-600 hover:border-primary/50 hover:text-primary active:scale-[0.98]"
                  }`}
                >
                  {item.label}
                </motion.button>
              </motion.li>
            ))}
          </motion.ul>
        </aside>

        {/* Content Body Area */}
        <div className="w-full min-w-0 max-w-[1098px] space-y-12 md:space-y-16">

          {/* Profile Section */}
          <section
            id="profile"
            data-about-reveal
            className="scroll-mt-24 flex translate-y-5 flex-col gap-8 opacity-0 transition-all duration-700 ease-out lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="max-w-[700px] flex-1">
              <SectionBadge label="About Me" />

              {isLoading ? (
                <div className="mt-4 space-y-3">
                  <SkeletonLine className="h-4 w-full" />
                  <SkeletonLine className="h-4 w-[92%]" />
                  <SkeletonLine className="h-4 w-[80%]" />
                  <SkeletonLine className="h-4 w-[60%]" />
                </div>
              ) : aboutParagraphs.length === 0 ? (
                <p className="mt-4 text-base font-medium leading-relaxed text-neutral-600 text-justify sm:text-lg">
                  {displayAboutSummary}
                </p>
              ) : (
                <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-neutral-600 text-justify sm:text-lg">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              )}

              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
              >
                <motion.button
                  type="button"
                  onClick={() => window.open(profile?.resume_download_url || "", "_blank", "noopener,noreferrer")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-neutral-800 disabled:pointer-events-none disabled:opacity-60"
                >
                  <Download size={15} /> Download Resume
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => window.open(profile?.cv_download_url || "", "_blank", "noopener,noreferrer")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-white px-5 text-sm font-bold text-primary shadow-sm transition-colors duration-200 hover:bg-primary/5"
                >
                  <Download size={15} /> Download CV
                </motion.button>
              </motion.div>
            </div>

            {/* Milestones Panel */}
            <div className="grid w-full shrink-0 grid-cols-2 gap-3.5 lg:max-w-[260px] lg:grid-cols-1">
              {isLoading ? (
                <>
                  <SkeletonCard className="h-[84px]" />
                  <SkeletonCard className="h-[84px]" />
                </>
              ) : milestones.length === 0 ? (
                <BentoCard className="col-span-2 lg:col-span-1">
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-neutral-500">No milestones yet.</p>
                  </div>
                </BentoCard>
              ) : (
                milestones.map((item, index) => (
                  <motion.div
                    key={`${item.label || "milestone"}-${item.value || "value"}-${index}`}
                    custom={index}
                    initial="hidden"
                    animate="visible" // <-- Change to animate
                    variants={fadeUpItemVariants}
                    whileHover={{ y: -3 }}
                          >
                    <BentoCard>
                      <div className="px-5 py-4">
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-neutral-400">{item.label || "Milestone"}</p>
                        <p className="mt-1 text-3xl font-extrabold leading-none tracking-tight text-primary">{item.value || "0"}</p>
                      </div>
                    </BentoCard>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Credentials Section — bento: education (wide cell) + certifications (narrow cell) */}
          <section
            id="credentials"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="Credentials" />
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">

              {isLoading ? (
                <>
                  <SkeletonCard className="h-64 lg:col-span-7" />
                  <SkeletonCard className="h-64 lg:col-span-5" />
                </>
              ) : (
                <>
                  <BentoCard className="lg:col-span-7">
                    <div className="p-6">
                      <h3 className="text-lg font-bold tracking-tight text-neutral-900">Education</h3>
                      <div className="mt-4 space-y-4 rounded-2xl border border-neutral-100/60 bg-neutral-50/50 p-4">
                        {education.length === 0 ? (
                          <p className="text-xs text-neutral-500">No education data yet.</p>
                        ) : education.map((item, index) => (
                          <motion.div
                            key={`${item.degree || "degree"}-${item.school || "school"}-${item.period || "period"}-${index}`}
                            custom={index}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.4 }}
                            variants={fadeUpItemVariants}
                            className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                          >
                            {item.degree ? (
                              <p className="text-sm font-bold leading-snug text-neutral-800">{item.degree}</p>
                            ) : null}
                            {item.school || item.period ? (
                              <p className="mt-1 text-xs font-medium text-neutral-500">
                                {item.school || ""} {item.period ? `(${item.period})` : ""}
                              </p>
                            ) : null}
                            {item.elective ? (
                              <span className="mt-2 inline-block rounded-md border border-primary/5 bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                {item.elective}
                              </span>
                            ) : null}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </BentoCard>

                  <BentoCard className="lg:col-span-5">
                    <div className="p-6">
                      <h3 className="text-lg font-bold tracking-tight text-neutral-900">Certifications</h3>
                      <div className="mt-4 space-y-2.5">
                        {certificationList.length === 0 ? (
                          <p className="text-xs text-neutral-500">No certifications yet.</p>
                        ) : certificationList.map((item, index) => (
                          <motion.div
                            key={`${item.name}-${index}`}
                            custom={index}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.4 }}
                            variants={fadeUpItemVariants}
                            whileHover={{ x: 2 }}
                            className="flex items-center justify-between gap-4 rounded-xl border border-neutral-100/50 bg-neutral-50/50 p-3 transition-all duration-200 hover:border-neutral-200/60"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-neutral-800">{item.name || ""}</p>
                              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                {(item.issuer || "").toUpperCase()}{item.date_earned ? ` - ${item.date_earned}` : ""}
                              </p>
                            </div>
                            {item.credential_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  isSupabaseUrl(item.credential_url)
                                    ? setActiveProofUrl(item.credential_url)
                                    : window.open(item.credential_url!, "_blank", "noopener,noreferrer")
                                }
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-sm shadow-neutral-900/10 transition-all duration-200 hover:bg-neutral-800 active:scale-95"
                              >
                                <ArrowUpRight size={14} />
                              </button>
                            ) : (
                              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400">
                                <ArrowUpRight size={14} />
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </BentoCard>
                </>
              )}
            </div>
          </section>

          {/* Experience Section — chronological timeline, not a bento grid (order is the information) */}
          <section
            id="experience"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="My Experience" />
            <div className="mt-4 space-y-4">
              {isLoading ? (
                <>
                  <SkeletonCard className="h-40" />
                  <SkeletonCard className="h-40" />
                </>
              ) : experienceList.length === 0 ? (
                <BentoCard>
                  <div className="p-5">
                    <p className="text-xs text-neutral-500">No experience data yet.</p>
                  </div>
                </BentoCard>
              ) : experienceList.map((item, index) => (
                <motion.div
                  key={item.id}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  variants={fadeUpItemVariants}
                  whileHover={{ y: -3 }}
                >
                <BentoCard
                  className=""
                >
                  <div
                    style={{ transitionDelay: `${Math.min(index, 6) * 50}ms` }}
                    className="p-5"
                  >
                    <div className="mb-3 flex w-full flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                      <div>
                        {item.role ? (
                          <p className="text-base font-bold tracking-tight text-neutral-900">{item.role}</p>
                        ) : null}
                        {item.company ? (
                          <p className="mt-0.5 text-sm font-semibold text-primary">{item.company}</p>
                        ) : null}
                      </div>
                      {(item.location || item.date) ? (
                        <p className="pt-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 sm:text-right">
                          {item.location}{item.location && item.date ? " | " : ""}{item.date}
                        </p>
                      ) : null}
                    </div>
                    {item.summary ? (
                      <p className="text-sm font-medium leading-relaxed text-neutral-500 text-justify">{item.summary}</p>
                    ) : null}
                    {item.skills.length > 0 ? (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {item.skills.map((skill, skillIndex) => (
                          <SkillTag
                            onClick={() => handleSkillTagClick(skill)}
                            key={`${item.id}-${skill}-${skillIndex}`}
                            label={skill}
                          />
                        ))}
                      </div>
                    ) : null}
                    {item.proofUrl ? (
                      <button
                        type="button"
                        onClick={() => setActiveProofUrl(item.proofUrl)}
                        className="mt-4 inline-flex h-8 items-center rounded-lg border border-primary bg-white px-4 text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-200 hover:bg-primary/5 active:scale-[0.98]"
                      >
                        View Attachment
                      </button>
                    ) : null}
                  </div>
                </BentoCard>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Tech Stacks Section — bento grid, alternating wide/narrow cells */}
          {/* --- Updated Tech Stacks Section --- */}
<section
  id="tech-stacks"
  data-about-reveal
  className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
>
  <SectionBadge label="What I Use" />
  {/* Force uniform grid: 1 col mobile, 2 col tablet, 3 col desktop */}
  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {isLoading ? (
      <>
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </>
    ) : (
      groupedTools.map((group, index) => (
        <motion.div
          key={group.title}
          custom={index}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUpItemVariants}
          whileHover={{ y: -3 }}
        >
          <BentoCard dark={group.dark} className="h-full">
            <div className="flex h-full flex-col p-5">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${group.dark ? "text-neutral-400" : "text-primary"}`}>
                {group.title}
              </h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {group.items.map((tool) => (
                  <SkillTag key={tool} onClick={() => handleSkillTagClick(tool)} label={tool} />
                ))}
              </div>
            </div>
          </BentoCard>
        </motion.div>
      ))
    )}
  </div>
</section>

          {/* --- Updated Specializations Section --- */}
          <section
            id="specializations"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="What I Can Offer" />
            <h3 className="mb-6 mt-2 text-xl font-bold tracking-tight text-neutral-900">Core Specializations</h3>
            
            {/* Force uniform grid matching the tech stack layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <>
                  <SkeletonCard className="h-48" />
                  <SkeletonCard className="h-48" />
                  <SkeletonCard className="h-48" />
                </>
              ) : specializationList.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  variants={fadeUpItemVariants}
                  whileHover={{ y: -3 }}
                >
                  <BentoCard className="h-full">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">✦</div>
                        <h4 className="text-sm font-bold text-neutral-900">{item.title}</h4>
                        <p className="mt-2 text-xs text-neutral-500 line-clamp-3">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => pageContext?.setCurrentPage("works")} 
                        className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary"
                      >
                        Related Works <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </BentoCard>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Specializations Section — bento grid, first cell featured */}
          <section
            id="specializations"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="What I Can Offer" />
            <h3 className="mb-6 mt-2 text-xl font-bold tracking-tight text-neutral-900">Core Specializations</h3>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <SkeletonCard className="h-48 lg:col-span-8" />
                <SkeletonCard className="h-48 lg:col-span-4" />
                <SkeletonCard className="h-48 lg:col-span-4" />
                <SkeletonCard className="h-48 lg:col-span-4" />
                <SkeletonCard className="h-48 lg:col-span-4" />
              </div>
            ) : specializationList.length === 0 ? (
              <BentoCard>
                <div className="p-5">
                  <p className="text-xs text-neutral-500">No specializations yet.</p>
                </div>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
                {specializationList.map((item, index) => {
                  const isFeatured = index === 0 && specializationList.length > 2;
                  return (
                    <motion.div
                      key={item.id || `${item.title}-${index}`}
                      custom={index}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.25 }}
                      variants={fadeUpItemVariants}
                      whileHover={{ y: -3 }}
                      className={`sm:col-span-2 ${isFeatured ? "lg:col-span-8" : "lg:col-span-4"}`}
                    >
                      <BentoCard>
                        <div className="flex h-full flex-col justify-between p-5">
                          <div>
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              whileInView={{ scale: 1, rotate: 0 }}
                              viewport={{ once: true, amount: 0.6 }}
                              transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 8) * 0.06 + 0.1 }}
                              className="mb-4 inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
                            >
                              ✦
                            </motion.div>
                            <h4 className="text-sm font-bold tracking-tight text-neutral-900">{item.title}</h4>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-500 text-justify">{item.description}</p>
                          </div>
                          <motion.button
                            type="button"
                            onClick={() => pageContext?.setCurrentPage("works")}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.95 }}
                            className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-200"
                          >
                            Related Works <ArrowUpRight size={12} />
                          </motion.button>
                        </div>
                      </BentoCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Modal Image Preview */}
      <AnimatePresence>
        {activeProofUrl ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Attachment preview"
            className="fixed inset-0 z-[120] flex items-center justify-center bg-neutral-950/60 px-4 backdrop-blur-xs animate-fade-in"
            onClick={() => setActiveProofUrl(null)}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalOverlayVariants}
          >
            <motion.div
              className="relative w-full max-w-[860px] overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/95 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
              variants={modalPanelVariants}
            >
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Attachment Preview
                </h3>
                <motion.button
                  type="button"
                  onClick={() => setActiveProofUrl(null)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  className="inline-flex size-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                  aria-label="Close proof preview"
                >
                  ✕
                </motion.button>
              </div>
              <div className="relative h-[60vh] min-h-[320px] bg-neutral-50">
                <motion.img
                  src={activeProofUrl}
                  alt="Experience proof"
                  className="h-full w-full select-none object-contain"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}