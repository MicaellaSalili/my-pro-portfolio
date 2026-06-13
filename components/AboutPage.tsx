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
  {
    title: "PROGRAMMING",
    dark: true,
  },
  {
    title: "FRAMEWORK & LIBRARIES",
    dark: false,
  },
  {
    title: "DESIGN",
    dark: true,
  },
  {
    title: "TOOLS",
    dark: false,
  },
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
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(ABOUT_PAGE_CACHE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AboutPageCacheData;
  } catch {
    return null;
  }
}

function writeAboutPageCache(value: AboutPageCacheData) {
  if (typeof window === "undefined") {
    return;
  }

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
      .select("degree, school, period, elective"),
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
    if (!skill) {
      return;
    }

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
    skills: (skillByExperience.get(item.id) || []).slice(0, 4),
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
  if (aboutPageMemoryCache) {
    return Promise.resolve(aboutPageMemoryCache);
  }

  if (aboutPagePending) {
    return aboutPagePending;
  }

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

function normalizeToolCategory(value: string | null) {
  const category = (value || "").toLowerCase();

  if (category.includes("design") || category.includes("ui") || category.includes("ux")) {
    return "DESIGN";
  }

  if (
    category.includes("framework") ||
    category.includes("library") ||
    category.includes("frontend")
  ) {
    return "FRAMEWORK & LIBRARIES";
  }

  if (
    category.includes("program") ||
    category.includes("backend") ||
    category.includes("database") ||
    category.includes("language")
  ) {
    return "PROGRAMMING";
  }

  return "TOOLS";
}

function SectionBadge({ label }: { label: string }) {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,white)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
      <span className="text-[13px]">◔</span>
      <span>{label}</span>
    </div>
  );
}

export default function AboutPage() {
  const pageContext = useContext(PageContext);
  const pageRef = useRef<HTMLElement | null>(null);
  const [cachedPageData] = useState<AboutPageCacheData | null>(() => {
    const initialData = aboutPageMemoryCache || readAboutPageCache();
    if (initialData) {
      aboutPageMemoryCache = initialData;
    }
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
      if (initialCachedData) {
        applyAboutData(initialCachedData);
      }

      const nextData = await prefetchAboutPageData();
      if (isUnmounted) {
        return;
      }

      applyAboutData(nextData);
    }

    void fetchAboutData();

    return () => {
      isUnmounted = true;
    };
  }, [cachedPageData]);

  const aboutSummary = profile?.about_summary?.trim() || "";
  const displayAboutSummary = aboutSummary || "No about summary yet.";
  const aboutParagraphs = (aboutSummary || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const groupedTools = useMemo<ToolGroupData[]>(() => {
    const groups = new Map<string, string[]>();

    toolGroups.forEach((group) => {
      groups.set(group.title, []);
    });

    toolSkills.forEach((item) => {
      if (!item.skill_name) {
        return;
      }
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
    if (!sectionElement) {
      return false;
    }

    setActiveSidebarItem(sectionId);
    sectionElement.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    return true;
  }

  useEffect(() => {
    const pendingSection = window.localStorage.getItem(ABOUT_SECTION_STORAGE_KEY) || "";
    if (pendingSection.trim()) {
      const handlePending = () => {
        goToSection(pendingSection, true);
        window.localStorage.removeItem(ABOUT_SECTION_STORAGE_KEY);
      };

      requestAnimationFrame(handlePending);
    }

    const handleAboutSectionNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ sectionId?: string }>;
      const targetSectionId = customEvent.detail?.sectionId || "";
      if (!targetSectionId.trim()) {
        return;
      }

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
          setActiveSidebarItem(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.4, 0.7],
      }
    );

    sidebarItems.forEach((item) => {
      const sectionElement = document.getElementById(item.id);
      if (sectionElement) {
        observer.observe(sectionElement);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const rootElement = pageRef.current;
    if (!rootElement) {
      return;
    }

    const revealElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>("[data-about-reveal]")
    );

    if (revealElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const target = entry.target as HTMLElement;
          target.classList.remove("opacity-0", "translate-y-5");
          target.classList.add("opacity-100", "translate-y-0");
          observer.unobserve(target);
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [experienceList.length, certificationList.length, groupedTools.length, specializationList.length]);

  useEffect(() => {
    if (!activeProofUrl) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveProofUrl(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeProofUrl]);

  return (
    <section ref={pageRef} className="w-full bg-transparent px-5 py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 lg:flex-row lg:gap-10">
        <aside data-about-reveal className="hidden w-full max-w-[270px] shrink-0 self-start translate-y-5 opacity-0 transition-all duration-700 ease-out lg:sticky lg:top-24 lg:block">
          <h2 className="mb-6 text-[22px] font-bold leading-none text-black">About</h2>
          <ul className="space-y-3">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    goToSection(item.id, true);
                  }}
                  className={`h-[50px] w-full rounded-[999px] border px-4 text-left text-[20px] leading-none transition-all ${
                    activeSidebarItem === item.id
                      ? "border-primary bg-primary text-white font-bold shadow-[0_6px_18px_rgba(128,94,255,0.35)] active:translate-y-[1px] active:scale-[0.99]"
                      : "border-[#DCE0E8] bg-transparent font-semibold text-secondary hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:translate-y-[1px] active:scale-[0.98]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="w-full min-w-0 max-w-[1098px] space-y-8 md:space-y-10">
          <div className="flex items-center justify-start lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-primary bg-white px-4 text-[14px] font-semibold text-primary shadow-[0_6px_16px_rgba(128,94,255,0.2)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="text-[18px] leading-none">☰</span>
              Sections
            </button>
          </div>

          <section id="profile" data-about-reveal className="scroll-mt-28 flex translate-y-5 flex-col gap-6 opacity-0 transition-all duration-700 ease-out lg:flex-row lg:justify-between">
            <div className="max-w-[700px]">
              <SectionBadge label="About Me" />
              {aboutParagraphs.length === 0 ? (
                <p className="mt-6 max-w-[650px] text-[17px] font-medium leading-[1.4] text-secondary transition-opacity duration-300 sm:text-[20px] sm:leading-[1.35]">
                  {displayAboutSummary}
                </p>
              ) : (
                <div className="mt-6 max-w-[650px] space-y-4 text-[17px] font-medium leading-[1.4] text-secondary transition-opacity duration-300 sm:text-[20px] sm:leading-[1.35]">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={profile?.resume_download_url || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[48px] items-center gap-2 rounded-[24px] bg-black px-5 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 active:translate-y-[1px] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  <Download size={16} /> Download Resume
                </a>
                <a
                  href={profile?.cv_download_url || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[48px] items-center gap-2 rounded-[24px] border border-primary bg-white px-6 text-[14px] font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] active:translate-y-[1px] active:scale-[0.98]"
                >
                  <Download size={16} /> Download CV
                </a>
              </div>
            </div>

            <div className="flex w-full max-w-full flex-col gap-4 pt-1 sm:max-w-[300px] sm:gap-6 sm:pt-5">
              {milestones.length === 0 ? (
                <article className="rounded-[10px] border border-primary bg-white px-4 py-5 shadow-[8px_8px_0px_0px_var(--color-primary)]">
                  <p className="text-[14px] font-medium text-secondary">No milestones yet.</p>
                </article>
              ) : (
                milestones.map((item, index) => (
                  <article
                    key={`${item.label || "milestone"}-${item.value || "value"}-${index}`}
                    className="rounded-[10px] border border-primary bg-white px-4 py-5 shadow-[8px_8px_0px_0px_var(--color-primary)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_var(--color-primary)] active:translate-y-0 active:scale-[0.99]"
                  >
                    <p className="text-[12px] font-semibold uppercase text-[#D3D3D3]">{item.label || "Milestone"}</p>
                    <p className="mt-1 text-[36px] font-bold leading-none text-primary">{item.value || "0"}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section id="credentials" data-about-reveal className="scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
            <SectionBadge label="Credentials" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
              <article className="rounded-[24px] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)]">
                <h3 className="text-[20px] font-bold text-black">Education</h3>
                <div className="mt-6 rounded-[14px] bg-[#F7F7F8] p-4">
                  {education.length === 0 ? (
                    <p className="text-[14px] text-secondary">No education data yet.</p>
                  ) : education.map((item, index) => (
                    <div
                      key={`${item.degree || "degree"}-${item.school || "school"}-${item.period || "period"}-${index}`}
                      className="mb-4 last:mb-0"
                    >
                      {item.degree ? <p className="text-[16px] font-semibold text-black">{item.degree}</p> : null}
                      {item.school || item.period ? (
                        <p className="mt-1 text-[14px] text-secondary">
                          {item.school || ""} {item.period ? `(${item.period})` : ""}
                        </p>
                      ) : null}
                      {item.elective ? (
                        <span className="mt-3 inline-block rounded-[6px] bg-[color-mix(in_srgb,var(--color-primary)_20%,white)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
                          {`${item.elective}`}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[24px] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)]">
                <h3 className="text-[20px] font-bold text-black">Certifications</h3>
                <div className="mt-6 space-y-3">
                  {certificationList.length === 0 ? (
                    <p className="text-[14px] text-secondary">No certifications yet.</p>
                  ) : certificationList.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-[18px] bg-[#F7F7F8] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5">
                      <div>
                        <p className="text-[14px] font-bold text-black">{item.name || ""}</p>
                        <p className="text-[12px] font-medium uppercase text-secondary">
                          {(item.issuer || "").toUpperCase()}{item.date_earned ? ` - ${item.date_earned}` : ""}
                        </p>
                      </div>
                      {item.credential_url ? (
                        <a
                          href={item.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-400 text-white transition-all duration-200 hover:bg-violet-500 active:scale-[0.96]"
                        >
                          <ArrowUpRight size={16} />
                        </a>
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-400 text-white"><ArrowUpRight size={16} /></span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section id="experience" data-about-reveal className="scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
            <SectionBadge label="My Experience" />
            <div className="space-y-5">
              {experienceList.length === 0 ? (
                <article className="rounded-[14px] bg-white p-5">
                  <p className="text-[14px] text-secondary">No experience data yet.</p>
                </article>
              ) : experienceList.map((item, index) => (
                <article
                  key={item.id}
                  style={{ transitionDelay: `${Math.min(index, 6) * 50}ms` }}
                  className="rounded-[14px] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)] active:translate-y-0"
                >
                  <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                    <div>
                      {item.role ? <p className="text-[20px] font-bold text-black">{item.role}</p> : null}
                      {item.company ? <p className="text-[20px] font-medium text-primary">{item.company}</p> : null}
                    </div>
                    {(item.location || item.date) ? (
                      <p className="text-[12px] font-medium uppercase text-secondary">{item.location}{item.location && item.date ? " | " : ""}{item.date}</p>
                    ) : null}
                  </div>
                  {item.summary ? <p className="text-[14px] font-medium leading-relaxed text-secondary">{item.summary}</p> : null}
                  {item.skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {item.skills.map((skill, index) => (
                      <SkillTag
                        onClick={() => handleSkillTagClick(skill)}
                        key={`${item.id}-${skill}-${index}`}
                        label={skill}
                      />
                    ))}
                    </div>
                  ) : null}
                  {item.proofUrl ? (
                    <button
                      type="button"
                      onClick={() => setActiveProofUrl(item.proofUrl)}
                      className="mt-4 inline-flex h-[36px] items-center rounded-[999px] border border-primary bg-white px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] active:translate-y-[1px] active:scale-[0.97]"
                    >
                      View
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section id="tech-stacks" data-about-reveal className="scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
            <SectionBadge label="What I Use" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {groupedTools.map((group) => (
                <article
                  key={group.title}
                  className={`rounded-[24px] p-5 transition-all duration-200 hover:-translate-y-1 ${group.dark ? "bg-[#17002F] hover:shadow-[6px_6px_0px_0px_var(--color-primary)]" : "bg-white hover:shadow-[6px_6px_0px_0px_var(--color-primary)]"}`}
                >
                  <h4 className={`text-[12px] font-semibold uppercase tracking-[0.18em] ${group.dark ? "text-white" : "text-primary"}`}>
                    {group.title}
                  </h4>
                  {group.items.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((tool) => (
                        <SkillTag
                          onClick={() => handleSkillTagClick(tool)}
                          key={tool}
                          label={tool}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-3 text-[12px] ${group.dark ? "text-white/70" : "text-secondary"}`}>No tools in this category yet.</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section id="specializations" data-about-reveal className="scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
            <SectionBadge label="What I Can Offer" />
            <h3 className="mb-4 text-center text-[24px] font-medium text-black">Core Specializations</h3>
            {specializationList.length === 0 ? (
              <article className="rounded-[14px] bg-white p-5">
                <p className="text-[14px] text-secondary">No specializations yet.</p>
              </article>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {specializationList.map((item, index) => (
                  <article
                    key={item.id || `${item.title}-${index}`}
                    className="rounded-[14px] border border-primary bg-white p-4 shadow-[6px_6px_0px_0px_var(--color-primary)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)] active:translate-y-0"
                  >
                    <div className="mb-3 inline-flex size-8 items-center justify-center rounded-[8px] bg-primary/15 text-primary">
                      ◻
                    </div>
                    <h4 className="text-[16px] font-medium text-black">{item.title}</h4>
                    <p className="mt-2 text-[12px] leading-relaxed text-secondary">{item.description}</p>
                    <button
                      type="button"
                      onClick={() => {
                        pageContext?.setCurrentPage("works");
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary transition-all duration-200 hover:translate-x-0.5 hover:text-primary/80 active:translate-x-[1px] active:scale-[0.97]"
                    >
                      View Related Works <ArrowUpRight size={12} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        </div>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/35 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="h-full w-full"
            aria-label="Close sections backdrop"
          />
          <div className="absolute left-0 top-0 h-full w-full max-w-[320px] overflow-y-auto bg-white px-4 py-4 shadow-[10px_0_24px_rgba(15,24,51,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-black">About Sections</h3>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 text-[18px] text-primary"
                aria-label="Close sections"
              >
                ✕
              </button>
            </div>

            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={`mobile-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      goToSection(item.id, true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`h-[42px] w-full rounded-[999px] border px-4 text-left text-[14px] leading-none transition-all ${
                      activeSidebarItem === item.id
                        ? "border-primary bg-primary font-bold text-white shadow-[0_6px_18px_rgba(128,94,255,0.35)] active:translate-y-[1px] active:scale-[0.99]"
                        : "border-[#DCE0E8] bg-transparent font-semibold text-secondary active:translate-y-[1px] active:scale-[0.98]"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {activeProofUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Experience proof preview"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setActiveProofUrl(null)}
        >
          <div
            className="relative w-full max-w-[920px] overflow-hidden rounded-[16px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ECECF2] px-4 py-3">
              <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-secondary">
               Preview
              </h3>
              <button
                type="button"
                onClick={() => setActiveProofUrl(null)}
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[#E2E4EA] text-secondary transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] hover:text-primary active:scale-[0.94]"
                aria-label="Close proof preview"
              >
                ✕
              </button>
            </div>

            <div className="relative h-[65vh] min-h-[360px] bg-[#F7F7F8]">
              <img
                src={activeProofUrl}
                alt="Experience proof"
                className="h-full w-full object-contain select-none"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}