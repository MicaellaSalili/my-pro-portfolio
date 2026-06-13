"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SkillTag from "./SkillTag";
import RevealOnScroll from "./RevealOnScroll";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { queueWorksTechFilter } from "../lib/worksTechFilter";

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
  project_skills?: {
    skill_id?: string;
    tech_stack?: {
      skill_name?: string | null;
    } | null;
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

interface SpecializationCardData {
  title: string;
  description: string;
  bullets: string[];
  icon: string;
  iconOverlay?: string;
  iconClassName: string;
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

type HomePageCacheData = {
  projects: ProjectData[];
  milestones: MilestoneData[];
  specializations: SpecializationData[];
  profile: FooterProfileData | null;
};

let cachedHomeProfile: FooterProfileData | null = null;
let homePageMemoryCache: HomePageCacheData | null = null;
let homePagePending: Promise<HomePageCacheData> | null = null;
const homeProfileStorageKey = "home_profile_cache_v1";

async function fetchHomePageDataFromServer(): Promise<HomePageCacheData> {
  const profileRequest = supabase
    .from("profile")
    .select("name, hero_title, hero_sub_headline, profile_image_url, cv_download_url, github_url, linkedin_url, email, viber_number, facebook_url, instagram_url")
    .single();

  const [{ data: projectsData }, { data: milestonesData }, { data: specializationData }, { data: profileData }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, description, thumbnail_url, is_featured, category, live_demo_url, github_repo_url, project_skills(skill_id, tech_stack(skill_name))")
      .order("created_at", { ascending: false }),
    supabase.from("milestones").select("id, label, value"),
    supabase
      .from("specializations")
      .select("id, title, description, bullets, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    profileRequest,
  ]);

  const nextProfile = (profileData as FooterProfileData | null) || null;
  if (nextProfile) {
    cachedHomeProfile = nextProfile;
    try {
      window.localStorage.setItem(homeProfileStorageKey, JSON.stringify(nextProfile));
    } catch {
    }
  }

  return {
    projects: (projectsData as ProjectData[]) || [],
    milestones: (milestonesData as MilestoneData[]) || [],
    specializations: (specializationData as SpecializationData[]) || [],
    profile: nextProfile || cachedHomeProfile,
  };
}

export function prefetchHomePageData(): Promise<HomePageCacheData> {
  if (homePageMemoryCache) {
    return Promise.resolve(homePageMemoryCache);
  }

  if (homePagePending) {
    return homePagePending;
  }

  const request = (async () => {
    try {
      const nextData = await fetchHomePageDataFromServer();
      homePageMemoryCache = nextData;
      return nextData;
    } finally {
      homePagePending = null;
    }
  })();

  homePagePending = request;
  return request;
}

const imgSpecRedesign = "/assets/home/spec-redesign.svg";
const imgArrowFilled = "/assets/hero/icon-arrow.svg";
const imgHeroProfile = "/assets/hero/icon-profile.svg";
const imgHeroGithub = "/assets/hero/icon-github.svg";
const imgHeroLinkedin = "/assets/hero/icon-linkedin.svg";
const imgHeroEmail = "/assets/hero/icon-email.svg";
const imgHeroEmailOverlay = "/assets/hero/icon-email-overlay.svg";
const imgHeroViber = "/assets/hero/icon-viber.svg";
const imgHeroFacebook = "/assets/hero/icon-facebook.svg";
const imgHeroInstagram = "/assets/hero/icon-instagram.svg";

function HomeHeroSection({
  setCurrentPage,
  profile,
}: {
  setCurrentPage: (page: string) => void;
  profile: FooterProfileData | null;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTooltipLabel, setActiveTooltipLabel] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(true), 40);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const viberLink = profile?.viber_number
    ? `viber://chat?number=${encodeURIComponent(profile.viber_number)}`
    : "";

  const socialLinks = useMemo(() => {
    return [
      { id: "cv", href: profile?.cv_download_url, label: "CV", type: "image" as const, src: imgHeroProfile },
      { id: "github", href: profile?.github_url, label: "GitHub", type: "image" as const, src: imgHeroGithub },
      { id: "linkedin", href: profile?.linkedin_url, label: "LinkedIn", type: "image" as const, src: imgHeroLinkedin },
      {
        id: "email",
        href: profile?.email ? `mailto:${profile.email}` : "",
        label: "Email",
        type: "email" as const,
        src: imgHeroEmail,
        srcOverlay: imgHeroEmailOverlay,
        rawValue: profile?.email?.trim() || "",
      },
      { 
        id: "mobile", 
        href: viberLink, 
        label: "Viber", 
        type: "image" as const, 
        src: imgHeroViber,
        rawValue: profile?.viber_number?.trim() || "",
      },
      { id: "facebook", href: profile?.facebook_url, label: "Facebook", type: "image" as const, src: imgHeroFacebook },
      { id: "instagram", href: profile?.instagram_url, label: "Instagram", type: "image" as const, src: imgHeroInstagram },
    ];
  }, [profile, viberLink]);

  const handleLinkInteraction = (e: React.MouseEvent<HTMLAnchorElement>, item: typeof socialLinks[number]) => {
    if (!item.href) {
      e.preventDefault();
      return;
    }

    if (item.id === "email" || item.id === "mobile") {
      if (item.rawValue) {
        // Modern Clipboard API approach (Requires HTTPS / Secure environments)
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(item.rawValue)
            .then(() => {
              setActiveTooltipLabel(`${item.label} copied!`);
              setTimeout(() => setActiveTooltipLabel(null), 2500);
            })
            .catch(() => {});
        } else {
          // Legacy HTTP safe fallback (Ensures zero errors over standard local IP/localhost addresses)
          const textArea = document.createElement("textarea");
          textArea.value = item.rawValue;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand("copy");
            setActiveTooltipLabel(`${item.label} copied!`);
            setTimeout(() => setActiveTooltipLabel(null), 2500);
          } catch (err) {
            // Failed fallback silently
          }
          document.body.removeChild(textArea);
        }
      }
    }
  };

  return (
    <section className="w-full px-5 pb-16 pt-8 sm:px-6 md:px-10 md:pb-20 lg:px-[70px] lg:pb-28 lg:pt-12">
      <div
        className={`mx-auto flex max-w-[1280px] flex-col-reverse items-center gap-10 transition-all duration-[900ms] ease-out lg:flex-row lg:justify-center lg:gap-20 motion-reduce:transition-none ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <div className="relative flex aspect-square w-full max-w-[280px] shrink-0 flex-col overflow-hidden rounded-[38px] border-2 border-violet-400 bg-white shadow-[8px_8px_0px_0px_var(--color-primary),0_18px_45px_rgba(128,94,255,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--color-primary),0_24px_60px_rgba(128,94,255,0.2)] sm:max-w-[340px] sm:rounded-[48px] md:max-w-[390px] lg:max-w-[430px]">
          <div className="flex h-[54px] w-full shrink-0 items-center gap-2 rounded-t-[36px] bg-white px-5 sm:h-[64px] sm:gap-3 sm:rounded-t-[46px] sm:px-9">
            <span className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#ef655d] sm:h-4 sm:w-4" style={{ aspectRatio: "1 / 1" }} />
            <span className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#e7bf45] sm:h-4 sm:w-4" style={{ aspectRatio: "1 / 1" }} />
            <span className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#62bd58] sm:h-4 sm:w-4" style={{ aspectRatio: "1 / 1" }} />
          </div>
          {profile?.profile_image_url ? (
            <img
              src={profile?.profile_image_url}
              alt={profile?.name || "Profile portrait"}
              className="h-full min-h-0 w-full flex-1 object-cover object-center"
            />
          ) : null}
        </div>

        <div
          className={`flex w-full max-w-[680px] flex-col items-center gap-6 px-1 text-center transition-all delay-150 duration-[950ms] ease-out md:items-start md:text-left motion-reduce:transition-none ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="max-w-full text-[42px] font-extrabold leading-[0.98] tracking-normal text-[#0f1833] sm:text-[54px] md:text-[68px] lg:text-[84px]">
            <p className="break-words">{profile?.hero_title}</p>
            <p className="break-words font-extrabold" style={{ color: "var(--color-primary)" }}>
              {profile?.name}
            </p>
          </div>

          <p className="max-w-[620px] text-[16px] font-medium leading-[1.65] text-slate-600 sm:text-[18px] md:text-[20px]">
            {profile?.hero_sub_headline}
          </p>

          <div className="flex flex-col items-center md:items-start gap-1 w-full min-h-[50px]">
            {activeTooltipLabel && (
              <span className="text-xs font-bold text-[#805eff] animate-fade-in mb-1">
                {activeTooltipLabel}
              </span>
            )}
            
            <div
              className="flex w-full flex-wrap items-center justify-center bg-transparent p-0 md:justify-start"
              style={{ gap: "clamp(4px, 2vw, 12px)" }}
            >
              {socialLinks.map((item) => {
                const isAppProtocol =
                  item.href && (item.href.startsWith("mailto:") || item.href.startsWith("viber:"));

                return (
                  <a
                    key={item.label}
                    href={item.href || "#"}
                    target={item.href && !isAppProtocol ? "_blank" : undefined}
                    rel={item.href && !isAppProtocol ? "noreferrer" : undefined}
                    aria-label={item.label}
                    onClick={(event) => handleLinkInteraction(event, item)}
                    className="relative flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-110 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:scale-95 cursor-pointer"
                    style={{
                      width: "clamp(32px, 9vw, 44px)",
                      height: "clamp(32px, 9vw, 44px)",
                    }}
                  >
                    <img
                      src={item.src}
                      alt=""
                      className="object-contain"
                      style={{
                        width: "clamp(22px, 6vw, 30px)",
                        height: "clamp(22px, 6vw, 30px)",
                      }}
                    />
                    {item.type === "email" && item.srcOverlay ? (
                      <img
                        src={item.srcOverlay}
                        alt=""
                        className="pointer-events-none absolute object-contain"
                        style={{
                          width: "clamp(20px, 5.5vw, 27px)",
                          height: "clamp(20px, 5.5vw, 27px)",
                        }}
                      />
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setCurrentPage("about")}
            className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] px-6 text-[20px] font-semibold leading-none text-white shadow-[0_10px_24px_rgba(128,94,255,0.28)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(128,94,255,0.36)] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.97] sm:px-7 sm:text-[22px]"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <span>Learn More</span>
            <img src={imgArrowFilled} alt="" className="ml-3 h-[18px] w-[22px]" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ProjectImageIcon() {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[48px] w-[48px] sm:h-[64px] sm:w-[64px]"
    >
      <rect x="4" y="8" width="76" height="68" rx="9" stroke="#292929" strokeWidth="3" />
      <circle cx="28" cy="28" r="6" stroke="#292929" strokeWidth="3" />
      <path d="M11 74L58.5 34L80 57" stroke="#292929" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ProjectCard({
  project,
  onClickSkillTag,
  onOpenProjectDetails,
}: {
  project: ProjectData;
  onClickSkillTag: (skill: string) => void;
  onOpenProjectDetails: (projectId: string) => void;
}) {
  const [showAllTech, setShowAllTech] = useState(false);

  function parseTechStack(value?: string | null) {
    if (!value) {
      return [] as string[];
    }
    const trimmedValue = value.trim();
    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      try {
        const parsedValue = JSON.parse(trimmedValue);
        if (Array.isArray(parsedValue)) {
          return parsedValue
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
        }
      } catch {
      }
    }
    return trimmedValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const relatedSkills = (project.project_skills || [])
    .map((item) => item.tech_stack?.skill_name?.trim() || "")
    .filter(Boolean);

  const techStack = relatedSkills.length > 0 ? relatedSkills : parseTechStack(project.category);
  const hasMoreTech = techStack.length > 3;
  const hiddenTechCount = Math.max(techStack.length - 3, 0);
  const visibleTechStack = showAllTech || !hasMoreTech ? techStack : techStack.slice(0, 3);

  return (
    <article
      onClick={() => onOpenProjectDetails(project.id)}
      className="group relative flex w-full cursor-pointer flex-col rounded-[16px] border border-primary bg-white shadow-[5px_5px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)] sm:rounded-[20px] sm:shadow-[7px_7px_0px_0px_var(--color-primary)] sm:hover:shadow-[11px_11px_0px_0px_var(--color-primary)]"
    >
      {/* Thumbnail — full width, fixed aspect ratio, no padding so image is flush */}
      <div className="relative w-full overflow-hidden rounded-t-[15px] sm:rounded-t-[19px]">
        <div className="aspect-[16/9] w-full bg-slate-100 sm:aspect-[16/10]">
          {project.thumbnail_url ? (
            <img
              src={project.thumbnail_url}
              alt={project.title}
              className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ProjectImageIcon />
            </div>
          )}
        </div>

        {/* Arrow button overlaid on image bottom-right */}
        <button
          type="button"
          aria-label={`See more about ${project.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProjectDetails(project.id);
          }}
          className="absolute bottom-3 right-3 inline-flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-primary text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus:outline-none active:scale-95 sm:h-[44px] sm:w-[44px] sm:rounded-[14px]"
        >
          <ArrowUpRight size={18} className="sm:hidden" />
          <ArrowUpRight size={22} className="hidden sm:block" />
        </button>
      </div>

      {/* Content — compact padding on mobile */}
      <div className="flex flex-1 flex-col gap-2 p-4 sm:gap-3 sm:p-5">
        {/* Tags */}
        <div className="flex min-h-[26px] flex-wrap items-center gap-1.5 sm:gap-2">
          {visibleTechStack.map((tech, idx) => (
            <SkillTag
              onClick={(event) => {
                event.stopPropagation();
                onClickSkillTag(tech);
              }}
              key={`${project.id}-${tech}-${idx}`}
              label={tech}
            />
          ))}
          {hasMoreTech ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowAllTech((previous) => !previous);
              }}
              className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-primary/15 px-2 text-[12px] font-semibold leading-none text-primary transition-colors hover:bg-primary/25 focus:outline-none sm:h-[30px] sm:text-[14px]"
              aria-label={showAllTech ? "Show fewer tech skills" : `Show ${hiddenTechCount} more tech skills`}
            >
              {showAllTech ? "−" : `+${hiddenTechCount}`}
            </button>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="text-left text-[18px] font-extrabold leading-[1.1] text-black sm:text-[26px] md:text-[32px]">
          {project.title}
        </h3>

        {/* Description */}
        <p className="line-clamp-2 text-left text-[13px] font-medium leading-relaxed text-secondary sm:line-clamp-3 sm:text-[15px]">
          {project.description}
        </p>
      </div>
    </article>
  );
}

export default function HomePage({ setCurrentPage, onOpenProjectDetails }: HomePageProps) {
  const [projects, setProjects] = useState<ProjectData[]>(homePageMemoryCache?.projects || []);
  const [milestones, setMilestones] = useState<MilestoneData[]>(homePageMemoryCache?.milestones || []);
  const [specializations, setSpecializations] = useState<SpecializationData[]>(homePageMemoryCache?.specializations || []);
  const [profile, setProfile] = useState<FooterProfileData | null>(homePageMemoryCache?.profile || cachedHomeProfile);
  const specCarouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    async function fetchHomeData() {
      try {
        if (!cachedHomeProfile) {
          try {
            const rawProfile = window.localStorage.getItem(homeProfileStorageKey);
            if (rawProfile) {
              const parsedProfile = JSON.parse(rawProfile) as FooterProfileData;
              cachedHomeProfile = parsedProfile;
              setProfile(parsedProfile);
            }
          } catch {
          }
        }

        if (homePageMemoryCache) {
          setProjects(homePageMemoryCache.projects);
          setMilestones(homePageMemoryCache.milestones);
          setSpecializations(homePageMemoryCache.specializations);
          setProfile(homePageMemoryCache.profile);
          return;
        }

        const nextData = await prefetchHomePageData();
        if (isUnmounted) {
          return;
        }

        setProjects(nextData.projects);
        setMilestones(nextData.milestones);
        setSpecializations(nextData.specializations);
        setProfile(nextData.profile);
      } finally {
        if (!isUnmounted) {
        }
      }
    }

    void fetchHomeData();

    return () => {
      isUnmounted = true;
    };
  }, []);

  const visibleProjects = useMemo(
    () => projects.filter((project) => project.is_featured === true),
    [projects]
  );

  const serviceCards = useMemo<SpecializationCardData[]>(() => {
    return specializations.map((item) => {
      return {
        title: item.title,
        description: item.description,
        bullets: item.bullets || [],
        icon: imgSpecRedesign,
        iconClassName: "h-[40px] w-[40px] sm:h-[52px] sm:w-[52px]",
      };
    });
  }, [specializations]);

  function handleSkillTagClick(skill: string) {
    queueWorksTechFilter(skill);
    setCurrentPage("works");
  }

  function scrollSpecializations(direction: "left" | "right") {
    const container = specCarouselRef.current;
    if (!container) {
      return;
    }

    const firstCard = container.querySelector<HTMLElement>("[data-spec-card]");
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : container.clientWidth * 0.85;
    const gap = 16;
    const scrollAmount = cardWidth + gap;

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }

  return (
    <div className="w-full overflow-hidden">
      <HomeHeroSection setCurrentPage={setCurrentPage} profile={profile} />

      {/* ── Specialization ── */}
      <RevealOnScroll threshold={0.2}>
        <section className="w-full px-4 py-8 sm:px-6 sm:py-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="p-0 sm:p-0">
              <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
                <h2 className="text-[22px] font-bold leading-tight text-secondary sm:text-[30px] lg:text-[36px]">
                  Specialization
                </h2>

                {serviceCards.length > 1 ? (
                  <div className="hidden items-center gap-2 sm:flex">
                    <button
                      type="button"
                      onClick={() => scrollSpecializations("left")}
                      aria-label="Scroll specializations left"
                      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full border border-primary/30 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:scale-95"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSpecializations("right")}
                      aria-label="Scroll specializations right"
                      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full border border-primary/30 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:scale-95"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Single-row horizontal carousel with scroll-snap */}
              <div
                ref={specCarouselRef}
                className="hide-scrollbar flex w-full items-stretch snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-6 sm:pb-3"
                style={{ scrollbarWidth: "none" }}
              >
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

                {serviceCards.map((card) => (
                  <article
                    key={card.title}
                    data-spec-card
                    className="group flex h-full shrink-0 snap-start flex-col rounded-[14px] border border-primary bg-white p-3 shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_var(--color-primary)] sm:rounded-[20px] sm:p-6 sm:shadow-[7px_7px_0px_0px_var(--color-primary)] sm:hover:shadow-[11px_11px_0px_0px_var(--color-primary)]"
                    style={{ width: "min(85vw, 340px)" }}
                  >
                    <div className="relative mb-2 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-primary/10 sm:mb-5 sm:h-[44px] sm:w-[44px] sm:rounded-[12px]">
                      <img
                        src={card.icon}
                        alt=""
                        className="h-[18px] w-[18px] object-contain transition-transform duration-300 ease-out group-hover:scale-110 sm:h-[28px] sm:w-[28px]"
                      />
                      {card.iconOverlay ? (
                        <img src={card.iconOverlay} alt="" className="absolute bottom-0.5 right-0.5 h-[10px] w-[10px] object-contain sm:bottom-1 sm:right-1 sm:h-[16px] sm:w-[16px]" />
                      ) : null}
                    </div>

                    <h3 className="mb-1 shrink-0 text-[14px] font-bold leading-tight text-black sm:mb-3 sm:text-[22px] md:text-[24px]">
                      {card.title}
                    </h3>

                    <p className="mb-1.5 shrink-0 text-[12px] font-medium leading-[1.45] text-secondary sm:mb-4 sm:text-[16px] sm:leading-[1.55] md:text-[17px]">
                      {card.description}
                    </p>

                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] font-medium leading-relaxed text-secondary sm:space-y-2 sm:pl-5 sm:text-[15px] md:text-[16px]">
                      {card.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col items-stretch justify-between gap-3 p-0 sm:mt-8 sm:gap-4 md:flex-row md:items-center">
              <p className="max-w-[840px] text-[12px] font-medium leading-relaxed text-secondary sm:text-[14px] md:text-[15px]">
                Have something specific in mind? Feel free to ask me any questions or let me know exactly what you need.
              </p>

              <button
                onClick={() => setCurrentPage("contact")}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:min-h-[46px] sm:rounded-xl sm:px-8 sm:text-base"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Inquire
                <img src={imgArrowFilled} alt="" className="ml-2 h-[14px] w-[18px] sm:ml-3 sm:h-[18px] sm:w-[22px]" />
              </button>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* ── Milestones ── */}
      <RevealOnScroll threshold={0.2}>
        <section className="w-full px-4 py-8 sm:px-6 sm:py-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-5 text-center sm:mb-8">
              <h2 className="text-[22px] font-bold leading-tight text-secondary sm:text-[30px] lg:text-[36px]">
                Milestones
              </h2>
            </div>

            {/* 3-column grid on mobile too, compact cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:grid-cols-3">
              {milestones.map((milestone) => (
                <article
                  key={milestone.id}
                  className="flex flex-col items-center justify-center rounded-[12px] border border-primary bg-white px-2 py-4 text-center shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_var(--color-primary)] sm:rounded-[16px] sm:px-5 sm:py-7 sm:shadow-[7px_7px_0px_0px_var(--color-primary)] sm:hover:shadow-[11px_11px_0px_0px_var(--color-primary)]"
                >
                  <p className="text-[22px] font-extrabold leading-none text-[#805eff] sm:text-[34px] md:text-[38px]">
                    {milestone.value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold leading-snug text-secondary sm:mt-3 sm:text-[17px] md:text-[19px]">
                    {milestone.label}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* ── Projects ── */}
      <RevealOnScroll threshold={0.05}>
        <section className="w-full px-4 py-8 sm:px-6 sm:py-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-5 flex flex-col items-center justify-between gap-3 sm:mb-7 sm:flex-row sm:gap-4">
              <h2 className="text-center text-[22px] font-bold leading-tight text-secondary sm:text-left sm:text-[30px] lg:text-[36px]">
                Projects
              </h2>

              <button
                onClick={() => setCurrentPage("works")}
                className="inline-flex h-[38px] w-full items-center justify-center rounded-[12px] border-[2px] border-primary bg-primary px-5 text-[14px] font-semibold leading-none text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:h-[48px] sm:w-auto sm:rounded-[16px] sm:border-[3px] sm:px-6 sm:text-[18px]"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-8 xl:grid-cols-2 xl:gap-10">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClickSkillTag={handleSkillTagClick}
                  onOpenProjectDetails={onOpenProjectDetails}
                />
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>
    </div>
  );
}