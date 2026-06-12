"use client";

import { useEffect, useMemo, useState } from "react";
import SkillTag from "./SkillTag";
import RevealOnScroll from "./RevealOnScroll";
import { ArrowUpRight } from "lucide-react";
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
  resume_download_url?: string;
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
    .select("name, hero_title, hero_sub_headline, profile_image_url, resume_download_url, github_url, linkedin_url, email, viber_number, facebook_url, instagram_url")
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(true), 40);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!profile) {
    return (
      <section className="w-full px-5 py-10 sm:px-6 md:px-10 lg:px-[70px]">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-16">
          <div
            className="aspect-square w-full max-w-[280px] animate-pulse rounded-t-[36px] border-2 bg-white/60 shadow-[8px_8px_0px_0px_var(--color-primary)] md:max-w-[340px]"
            style={{ borderColor: "var(--color-secondary)" }}
          />
          <div className="flex w-full max-w-[620px] flex-col gap-4 px-1">
            <div className="h-7 w-[70%] animate-pulse rounded bg-white/70" />
            <div className="h-10 w-[88%] animate-pulse rounded bg-white/70" />
            <div className="h-5 w-full animate-pulse rounded bg-white/70" />
            <div className="h-5 w-[82%] animate-pulse rounded bg-white/70" />
          </div>
        </div>
      </section>
    );
  }

  const viberLink = profile.viber_number
    ? `viber://chat?number=${encodeURIComponent(profile.viber_number)}`
    : "";

  const socialLinks = [
    { href: profile.resume_download_url, label: "Resume", type: "image" as const, src: imgHeroProfile },
    { href: profile.github_url, label: "GitHub", type: "image" as const, src: imgHeroGithub },
    { href: profile.linkedin_url, label: "LinkedIn", type: "image" as const, src: imgHeroLinkedin },
    {
      href: profile.email ? `mailto:${profile.email}` : "",
      label: "Email",
      type: "email" as const,
      src: imgHeroEmail,
      srcOverlay: imgHeroEmailOverlay,
    },
    { href: viberLink, label: "Viber", type: "image" as const, src: imgHeroViber },
    { href: profile.facebook_url, label: "Facebook", type: "image" as const, src: imgHeroFacebook },
    { href: profile.instagram_url, label: "Instagram", type: "image" as const, src: imgHeroInstagram },
  ];

  return (
    <section className="w-full px-5 pb-16 pt-8 sm:px-6 md:px-10 md:pb-20 lg:px-[70px] lg:pb-28 lg:pt-12">
      <div
        className={`mx-auto flex max-w-[1280px] flex-col-reverse items-center gap-10 transition-all duration-[900ms] ease-out lg:flex-row lg:justify-center lg:gap-20 motion-reduce:transition-none ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* FIX 2: Profile image card with properly sized decorative dots */}
        <div className="relative flex aspect-square w-full max-w-[280px] shrink-0 flex-col overflow-hidden rounded-[38px] border-2 border-violet-400 bg-white shadow-[8px_8px_0px_0px_var(--color-primary),0_18px_45px_rgba(128,94,255,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--color-primary),0_24px_60px_rgba(128,94,255,0.2)] sm:max-w-[340px] sm:rounded-[48px] md:max-w-[390px] lg:max-w-[430px]">
          {/*
            FIX 2 APPLIED HERE:
            - Dots changed from h-0.5 w-0.5 (2px) on mobile to h-3 w-3 (12px) — actually visible
            - Added flex-shrink-0 so flex container never compresses them
            - Added block so the <span> respects explicit width/height
            - Added aspect-ratio via inline style to lock the circle shape
            - Tightened gap to gap-2 on mobile, gap-3 on sm+
            - Reduced px from px-7 to px-5 on mobile for better breathing room
          */}
          <div className="flex h-[54px] w-full shrink-0 items-center gap-2 rounded-t-[36px] bg-white px-5 sm:h-[64px] sm:gap-3 sm:rounded-t-[46px] sm:px-9">
            <span
              className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#ef655d] sm:h-4 sm:w-4"
              style={{ aspectRatio: "1 / 1" }}
            />
            <span
              className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#e7bf45] sm:h-4 sm:w-4"
              style={{ aspectRatio: "1 / 1" }}
            />
            <span
              className="block h-3 w-3 flex-shrink-0 rounded-full bg-[#62bd58] sm:h-4 sm:w-4"
              style={{ aspectRatio: "1 / 1" }}
            />
          </div>
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.name || "Profile portrait"}
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
            <p className="break-words">{profile.hero_title}</p>
            <p className="break-words font-extrabold" style={{ color: "var(--color-primary)" }}>
              {profile.name}
            </p>
          </div>

          <p className="max-w-[620px] text-[16px] font-medium leading-[1.65] text-slate-600 sm:text-[18px] md:text-[20px]">
            {profile.hero_sub_headline}
          </p>

          {/*
            FIX 1 APPLIED HERE:
            - gap changed from gap-3 (12px fixed) to a fluid clamp via inline style
            - Each <a> gets flex-shrink-0 so it never compresses below its clamp size
            - Icon tap target uses clamp(32px, 9vw, 44px): at 320px = ~29px, at 375px = ~34px, at 768px+ = 44px
            - Inner <img> also uses clamp for proportional fluid scaling
            - This keeps all 7 icons on a single row down to 320px viewport width
          */}
          <div
            className="flex w-full flex-wrap items-center justify-center bg-transparent p-0 md:justify-start"
            style={{ gap: "clamp(4px, 2vw, 12px)" }}
          >
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
                className="relative flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-110 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95"
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
            ))}
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
      className="h-[72px] w-[72px] sm:h-[84px] sm:w-[84px]"
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
      className="group relative flex h-full w-full cursor-pointer flex-col rounded-[20px] border border-primary bg-white p-4 pb-20 shadow-[7px_7px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_var(--color-primary)] sm:p-5 sm:pb-24"
    >
      <div className="mb-5 flex min-h-[32px] flex-wrap items-center gap-2">
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
            className="inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-primary/15 px-2 text-[14px] font-semibold leading-none text-primary transition-colors hover:bg-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={showAllTech ? "Show fewer tech skills" : `Show ${hiddenTechCount} more tech skills`}
          >
            {showAllTech ? "-" : `+${hiddenTechCount}`}
          </button>
        ) : null}
      </div>

      <div className="mb-6 flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[16px] bg-slate-50">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="h-full w-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <ProjectImageIcon />
        )}
      </div>

      <h3 className="text-left text-[28px] font-extrabold leading-[1.08] text-black sm:text-[34px] md:text-[38px]">
        {project.title}
      </h3>

      <p className="mt-3 line-clamp-3 text-left text-[15px] font-medium leading-relaxed text-secondary sm:text-[16px]">
        {project.description}
      </p>

      <button
        type="button"
        aria-label={`See more about ${project.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenProjectDetails(project.id);
        }}
        className="absolute bottom-6 right-6 inline-flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-primary text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-95 sm:bottom-7 sm:right-7 sm:h-[48px] sm:w-[48px]"
      >
        <ArrowUpRight size={22} />
      </button>
    </article>
  );
}

export default function HomePage({ setCurrentPage, onOpenProjectDetails }: HomePageProps) {
  const [projects, setProjects] = useState<ProjectData[]>(homePageMemoryCache?.projects || []);
  const [milestones, setMilestones] = useState<MilestoneData[]>(homePageMemoryCache?.milestones || []);
  const [specializations, setSpecializations] = useState<SpecializationData[]>(homePageMemoryCache?.specializations || []);
  const [profile, setProfile] = useState<FooterProfileData | null>(homePageMemoryCache?.profile || cachedHomeProfile);
  const [isHomeReady, setIsHomeReady] = useState<boolean>(Boolean(homePageMemoryCache?.profile || cachedHomeProfile));

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
              setIsHomeReady(true);
            }
          } catch {
          }
        }

        if (homePageMemoryCache) {
          setProjects(homePageMemoryCache.projects);
          setMilestones(homePageMemoryCache.milestones);
          setSpecializations(homePageMemoryCache.specializations);
          setProfile(homePageMemoryCache.profile);
          setIsHomeReady(true);
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
          setIsHomeReady(true);
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
        iconClassName: "h-[52px] w-[52px] sm:h-[56px] sm:w-[56px]",
      };
    });
  }, [specializations]);

  function handleSkillTagClick(skill: string) {
    queueWorksTechFilter(skill);
    setCurrentPage("works");
  }

  if (!isHomeReady) {
    return (
      <section className="w-full px-5 pb-12 pt-10 sm:px-6 md:px-10 lg:flex lg:min-h-[calc(100vh-120px)] lg:items-center lg:px-[70px] lg:py-0">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center gap-4">
          <div className="h-3 w-[180px] animate-pulse rounded-full bg-primary/40" />
          <p className="text-sm font-medium text-secondary/80">Loading portfolio...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <HomeHeroSection setCurrentPage={setCurrentPage} profile={profile} />

      <RevealOnScroll threshold={0.2}>
        <section className="w-full px-5 py-12 sm:px-6 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-8 text-center">
              <h2 className="text-[30px] font-bold leading-tight text-secondary sm:text-[36px]">
                Specialization
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-[30px]">
              {serviceCards.map((card) => (
                <article
                  key={card.title}
                  className="group rounded-[20px] border border-primary bg-white p-5 shadow-[7px_7px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_var(--color-primary)] sm:p-6"
                >
                  <div className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-primary/10">
                    <img src={card.icon} alt="" className={`${card.iconClassName} object-contain transition-transform duration-300 ease-out group-hover:scale-110`} />
                    {card.iconOverlay ? (
                      <img src={card.iconOverlay} alt="" className="absolute bottom-1 right-1 h-[24px] w-[24px] object-contain" />
                    ) : null}
                  </div>

                  <h3 className="mb-3 text-[22px] font-bold leading-tight text-black sm:text-[24px]">
                    {card.title}
                  </h3>

                  <p className="mb-4 text-[16px] font-medium leading-[1.55] text-secondary sm:text-[17px]">
                    {card.description}
                  </p>

                  <ul className="list-disc space-y-2 pl-5 text-[15px] font-medium leading-relaxed text-secondary sm:text-[16px]">
                    {card.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-stretch justify-between gap-4 rounded-[20px] border border-primary/15 bg-white/60 p-4 backdrop-blur sm:p-5 md:flex-row md:items-center">
              <p className="max-w-[840px] text-[14px] font-medium leading-relaxed text-secondary sm:text-[15px]">
                Have something specific in mind? Feel free to ask me any questions or let me know exactly what you need.
              </p>

              <button
                onClick={() => setCurrentPage("contact")}
                className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] md:px-8 md:text-base"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Inquire
                <img src={imgArrowFilled} alt="" className="ml-3 h-[18px] w-[22px]" />
              </button>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll threshold={0.2}>
        <section className="w-full px-5 py-12 sm:px-6 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-8 text-center">
              <h2 className="text-[30px] font-bold leading-tight text-secondary sm:text-[36px]">
                Milestones
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone) => (
                <article
                  key={milestone.id}
                  className="flex min-h-[128px] flex-col items-center justify-center rounded-[16px] border border-primary bg-white px-5 py-7 text-center shadow-[7px_7px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[11px_11px_0px_0px_var(--color-primary)]"
                >
                  <p className="text-[34px] font-extrabold leading-none text-[#805eff] sm:text-[38px]">
                    {milestone.value}
                  </p>
                  <p className="mt-3 text-[17px] font-semibold leading-snug text-secondary sm:text-[19px]">
                    {milestone.label}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll threshold={0.05}>
        <section className="w-full px-5 py-12 sm:px-6 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-7 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <h2 className="text-center text-[30px] font-bold leading-tight text-secondary sm:text-left sm:text-[36px]">
                Projects
              </h2>

              <button
                onClick={() => setCurrentPage("works")}
                className="inline-flex h-[48px] w-full items-center justify-center rounded-[16px] border-[3px] border-primary bg-primary px-6 text-[18px] font-semibold leading-none text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:w-auto"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-8 xl:grid-cols-2 xl:gap-10">
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