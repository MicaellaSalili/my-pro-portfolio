"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
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

let aboutPageMemoryCache: AboutPageCacheData | null = null;
let aboutPagePending: Promise<AboutPageCacheData> | null = null;

function readAboutPageCache(): AboutPageCacheData | null {
  if (typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(ABOUT_PAGE_CACHE_KEY);
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue) as AboutPageCacheData;
  } catch {
    return null;
  }
}

function writeAboutPageCache(value: AboutPageCacheData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABOUT_PAGE_CACHE_KEY, JSON.stringify(value));
}

async function fetchAboutPageDataFromServer(): Promise<AboutPageCacheData> {
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
    supabase
      .from("profile")
      .select("name, about_summary, resume_download_url, cv_download_url")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("education")
      .select("degree, school, period, elective, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("certifications")
      .select("name, issuer, date_earned, credential_url"),
    supabase
      .from("experience")
      .select("id, role, company, location, period, description, sort_order, proof_url")
      .order("sort_order", { ascending: true }),
    supabase
      .from("tech_stack")
      .select("id, category, skill_name"),
    supabase
      .from("experience_skills")
      .select("experience_id, skill_id, tech_stack(skill_name)"),
    supabase
      .from("specializations")
      .select("id, title, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("milestones").select("label, value"),
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
  const milestones = ((milestonesResult.data || []) as MilestoneData[]).filter(
    (item) => (item.label || "").trim() || (item.value || "").trim()
  );

  const fallbackMilestones: MilestoneData[] = milestones.length
    ? milestones
    : [
        { label: "Experience", value: `${experiencesData.length}` },
        { label: "Projects", value: `${projectCount}` },
      ];

  return {
    profile: profileData,
    education: educationData,
    certificationList: certificationsData,
    experienceList: mappedExperience,
    toolSkills: techStackData,
    specializationList: specializationsData,
    milestones: fallbackMilestones,
  };
}

export function prefetchAboutPageData(): Promise<AboutPageCacheData> {
  if (aboutPageMemoryCache) return Promise.resolve(aboutPageMemoryCache);
  if (aboutPagePending) return aboutPagePending;

  const request = (async () => {
    try {
      const nextData = await fetchAboutPageDataFromServer();
      aboutPageMemoryCache = nextData;
      writeAboutPageCache(nextData);
      return nextData;
    } finally {
      aboutPagePending = null;
    }
  })();

  aboutPagePending = request;
  return request;
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
    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary border border-primary/10">
      <span className="text-[14px] leading-none">◔</span>
      <span>{label}</span>
    </div>
  );
}

export default function AboutPage() {
  const pageContext = useContext(PageContext);
  const pageRef = useRef<HTMLElement | null>(null);
  const scrollTabsRef = useRef<HTMLDivElement | null>(null);

  const [cachedPageData] = useState<AboutPageCacheData | null>(() => {
    const initialData = aboutPageMemoryCache || readAboutPageCache();
    if (initialData) aboutPageMemoryCache = initialData;
    return initialData;
  });

  const [profile, setProfile] = useState<ProfileData | null>(cachedPageData?.profile || null);
  const [education, setEducation] = useState<EducationData[]>(cachedPageData?.education || []);
  const [certificationList, setCertificationList] = useState<CertificationData[]>(cachedPageData?.certificationList || []);
  const [experienceList, setExperienceList] = useState<ExperienceWithSkills[]>(cachedPageData?.experienceList || []);
  const [toolSkills, setToolSkills] = useState<TechStackData[]>(cachedPageData?.toolSkills || []);
  const [specializationList, setSpecializationList] = useState<SpecializationData[]>(cachedPageData?.specializationList || []);
  const [milestones, setMilestones] = useState<MilestoneData[]>(cachedPageData?.milestones || []);
  const [activeSidebarItem, setActiveSidebarItem] = useState(sidebarItems[0].id);
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    const applyAboutData = (nextData: AboutPageCacheData) => {
      setProfile(nextData.profile);
      setEducation(nextData.education);
      setCertificationList(nextData.certificationList);
      setExperienceList(nextData.experienceList);
      setToolSkills(nextData.toolSkills);
      setSpecializationList(nextData.specializationList);
      setMilestones(nextData.milestones);
    };

    async function fetchAboutData() {
      const initialCachedData = aboutPageMemoryCache || cachedPageData;
      if (initialCachedData) applyAboutData(initialCachedData);
      const nextData = await prefetchAboutPageData();
      if (isUnmounted) return;
      applyAboutData(nextData);
    }

    void fetchAboutData();
    return () => { isUnmounted = true; };
  }, [cachedPageData]);

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
  }, [experienceList.length, certificationList.length, groupedTools.length, specializationList.length]);

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
      <div className="sticky top-0 z-50 -mx-4 mb-6 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-4 py-2.5 lg:hidden">
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
                  : "bg-neutral-50 border border-neutral-200/50 text-neutral-600 hover:border-neutral-300"
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
          className="hidden w-full max-w-[240px] shrink-0 self-start translate-y-5 opacity-0 transition-all duration-700 ease-out lg:sticky lg:top-24 lg:block"
        >
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-neutral-900">About</h2>
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goToSection(item.id, true)}
                  className={`h-11 w-full rounded-xl border px-4 text-left text-sm transition-all duration-200 ${
                    activeSidebarItem === item.id
                      ? "border-primary bg-primary text-white font-bold shadow-md shadow-primary/20 active:translate-y-[1px]"
                      : "border-neutral-200/70 bg-transparent font-semibold text-neutral-600 hover:border-primary/50 hover:text-primary active:scale-[0.98]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Body Area */}
        <div className="w-full min-w-0 max-w-[1098px] space-y-12 md:space-y-16">

          {/* Profile Section */}
          <section
            id="profile"
            data-about-reveal
            className="scroll-mt-24 flex translate-y-5 flex-col gap-8 opacity-0 transition-all duration-700 ease-out lg:flex-row lg:justify-between lg:items-start"
          >
            <div className="max-w-[700px] flex-1">
              <SectionBadge label="About Me" />
              {aboutParagraphs.length === 0 ? (
                <p className="mt-4 text-base font-medium leading-relaxed text-neutral-600 sm:text-lg text-justify">
                  {displayAboutSummary}
                </p>
              ) : (
                <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-neutral-600 sm:text-lg text-justify">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.open(profile?.resume_download_url || "", "_blank", "noopener,noreferrer")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 shadow-sm"
                >
                  <Download size={15} /> Download Resume
                </button>
                <button
                  type="button"
                  onClick={() => window.open(profile?.cv_download_url || "", "_blank", "noopener,noreferrer")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-white px-5 text-sm font-bold text-primary transition-all duration-200 hover:bg-primary/5 active:scale-[0.98] shadow-sm"
                >
                  <Download size={15} /> Download CV
                </button>
              </div>
            </div>

            {/* Milestones Panel */}
            <div className="w-full grid grid-cols-2 gap-3.5 lg:grid-cols-1 lg:max-w-[260px] shrink-0">
              {milestones.length === 0 ? (
                <article className="col-span-2 lg:col-span-1 rounded-2xl border border-primary bg-white px-5 py-4 shadow-[4px_4px_0px_0px_var(--color-primary)]">
                  <p className="text-xs font-medium text-neutral-500">No milestones yet.</p>
                </article>
              ) : (
                milestones.map((item, index) => (
                  <article
                    key={`${item.label || "milestone"}-${item.value || "value"}-${index}`}
                    className="rounded-2xl border border-primary bg-white px-5 py-4 shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-primary)] active:translate-y-0"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">{item.label || "Milestone"}</p>
                    <p className="mt-1 text-3xl font-extrabold leading-none text-primary">{item.value || "0"}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* Credentials Section */}
          <section
            id="credentials"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="Credentials" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-4">

              <article className="rounded-[32px] border border-neutral-100 bg-white p-6 shadow-sm shadow-neutral-100">
                <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Education</h3>
                <div className="mt-4 space-y-4 rounded-2xl bg-neutral-50/50 p-4 border border-neutral-100/50">
                  {education.length === 0 ? (
                    <p className="text-xs text-neutral-500">No education data yet.</p>
                  ) : education.map((item, index) => (
                    <div
                      key={`${item.degree || "degree"}-${item.school || "school"}-${item.period || "period"}-${index}`}
                      className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                    >
                      {item.degree ? (
                        <p className="text-sm font-bold text-neutral-800 leading-snug">{item.degree}</p>
                      ) : null}
                      {item.school || item.period ? (
                        <p className="mt-1 text-xs font-medium text-neutral-500">
                          {item.school || ""} {item.period ? `(${item.period})` : ""}
                        </p>
                      ) : null}
                      {item.elective ? (
                        <span className="mt-2 inline-block rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/5">
                          {item.elective}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[32px] border border-neutral-100 bg-white p-6 shadow-sm shadow-neutral-100">
                <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Certifications</h3>
                <div className="mt-4 space-y-2.5">
                  {certificationList.length === 0 ? (
                    <p className="text-xs text-neutral-500">No certifications yet.</p>
                  ) : certificationList.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50/50 p-3 border border-neutral-100/50 transition-all duration-200 hover:border-neutral-200/60"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-800 truncate">{item.name || ""}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5 truncate">
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
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white transition-all duration-200 hover:bg-neutral-800 active:scale-95 shadow-sm shadow-neutral-900/10"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400">
                          <ArrowUpRight size={14} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          {/* Experience Section */}
          <section
            id="experience"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="My Experience" />
            <div className="space-y-4 mt-4">
              {experienceList.length === 0 ? (
                <article className="rounded-xl bg-white p-5 border border-neutral-100">
                  <p className="text-xs text-neutral-500">No experience data yet.</p>
                </article>
              ) : experienceList.map((item, index) => (
                <article
                  key={item.id}
                  style={{ transitionDelay: `${Math.min(index, 6) * 50}ms` }}
                  className="rounded-2xl border border-primary bg-white p-5 shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-primary)] active:translate-y-0"
                >
                  <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4 w-full">
                    <div>
                      {item.role ? (
                        <p className="text-base font-bold text-neutral-900 tracking-tight">{item.role}</p>
                      ) : null}
                      {item.company ? (
                        <p className="text-sm font-semibold text-primary mt-0.5">{item.company}</p>
                      ) : null}
                    </div>
                    {(item.location || item.date) ? (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 sm:text-right pt-0.5">
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
                </article>
              ))}
            </div>
          </section>

          {/* Tech Stacks Section */}
          <section
            id="tech-stacks"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="What I Use" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
              {groupedTools.map((group) => (
                <article
                  key={group.title}
                  className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 ${
                    group.dark
                      ? "bg-neutral-900 border-neutral-900 shadow-md shadow-neutral-950/10 hover:shadow-lg hover:shadow-neutral-950/20"
                      : "bg-white border-neutral-100 shadow-sm hover:shadow-md"
                  }`}
                >
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${group.dark ? "text-neutral-400" : "text-primary"}`}>
                    {group.title}
                  </h4>
                  {group.items.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.items.map((tool) => (
                        <SkillTag
                          onClick={() => handleSkillTagClick(tool)}
                          key={tool}
                          label={tool}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-3 text-xs font-medium ${group.dark ? "text-neutral-500" : "text-neutral-400"}`}>
                      No tools listed.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* Specializations Section */}
          <section
            id="specializations"
            data-about-reveal
            className="scroll-mt-24 translate-y-5 opacity-0 transition-all duration-700 ease-out"
          >
            <SectionBadge label="What I Can Offer" />
            <h3 className="text-xl font-bold tracking-tight text-neutral-900 mb-6 mt-2">Core Specializations</h3>
            {specializationList.length === 0 ? (
              <article className="rounded-xl bg-white p-5 border border-neutral-100">
                <p className="text-xs text-neutral-500">No specializations yet.</p>
              </article>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specializationList.map((item, index) => (
                  <article
                    key={item.id || `${item.title}-${index}`}
                    className="rounded-2xl border border-primary bg-white p-5 shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-primary)] active:translate-y-0 flex flex-col justify-between"
                  >
                    <div>
                      <div className="mb-4 inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        ✦
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 tracking-tight">{item.title}</h4>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-500 font-medium text-justify">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => pageContext?.setCurrentPage("works")}
                      className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-all duration-200 hover:translate-x-0.5"
                    >
                      Related Works <ArrowUpRight size={12} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Modal Image Preview */}
      {activeProofUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs px-4 animate-fade-in"
          onClick={() => setActiveProofUrl(null)}
        >
          <div
            className="relative w-full max-w-[860px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Attachment Preview
              </h3>
              <button
                type="button"
                onClick={() => setActiveProofUrl(null)}
                className="inline-flex size-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 active:scale-90 transition-all"
                aria-label="Close proof preview"
              >
                ✕
              </button>
            </div>
            <div className="relative h-[60vh] min-h-[320px] bg-neutral-50">
              <img
                src={activeProofUrl}
                alt="Experience proof"
                className="h-full w-full object-contain select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}