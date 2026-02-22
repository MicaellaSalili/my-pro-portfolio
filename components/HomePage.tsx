"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HeroSection from "./HeroSection";
import SkillTag from "./SkillTag";
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

function RevealOnScroll({
  children,
  delayMs = 0,
}: {
  children: React.ReactNode;
  delayMs?: number;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const currentElement = sectionRef.current;
    if (!currentElement) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(currentElement);

    return () => {
      observer.unobserve(currentElement);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

let cachedHomeProfile: FooterProfileData | null = null;
const homeProfileStorageKey = "home_profile_cache_v1";

const imgSpecRedesign = "/assets/home/spec-redesign.svg";
const imgArrowFilled = "/assets/hero/icon-arrow.svg";

function ProjectImageIcon() {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[84px] w-[84px]"
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
      className="group relative h-full w-full cursor-pointer rounded-[20px] border border-primary bg-white p-[20px] pb-24 shadow-[10px_10px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[14px_14px_0px_0px_var(--color-primary)]"
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
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
            className="inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-primary/15 px-2 text-[14px] font-semibold leading-none text-primary transition-colors hover:bg-primary/25"
            aria-label={showAllTech ? "Show fewer tech skills" : `Show ${hiddenTechCount} more tech skills`}
          >
            {showAllTech ? "−" : `+${hiddenTechCount}`}
          </button>
        ) : null}
      </div>

      <div className="mb-8 h-[194px] w-full overflow-hidden rounded-[18px] bg-white">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="h-full w-full object-contain object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ProjectImageIcon />
          </div>
        )}
      </div>

      <h3 className="text-left text-[42px] font-extrabold leading-[1.06] text-black">
        {project.title}
      </h3>

      <p className="mt-3 line-clamp-3 text-left text-[16px] font-medium leading-relaxed text-secondary">
        {project.description}
      </p>

      <button
        type="button"
        aria-label={`See more about ${project.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenProjectDetails(project.id);
        }}
        className="absolute bottom-8 right-8 inline-flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-primary text-[24px] font-semibold leading-none text-white transition-colors hover:opacity-90"
      >
        ↗
      </button>
    </article>
  );
}

export default function HomePage({ setCurrentPage, onOpenProjectDetails }: HomePageProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationData[]>([]);
  const [profile, setProfile] = useState<FooterProfileData | null>(cachedHomeProfile);
  const [isHomeReady, setIsHomeReady] = useState<boolean>(Boolean(cachedHomeProfile));

  useEffect(() => {
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

        const profileRequest = supabase
          .from("profile")
          .select("name, hero_title, hero_sub_headline, profile_image_url, resume_download_url, github_url, linkedin_url, email, viber_number, facebook_url, instagram_url")
          .single();

        const [{ data: projectsData }, { data: milestonesData }, { data: specializationData }, { data: profileData }] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, description, thumbnail_url, is_featured, category, live_demo_url, github_repo_url, project_skills(skill_id, tech_stack(skill_name))")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("milestones").select("id, label, value").limit(2),
          supabase
            .from("specializations")
            .select("id, title, description, bullets, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .limit(3),
          profileRequest,
        ]);

        if (projectsData) {
          setProjects(projectsData as ProjectData[]);
        }
        if (milestonesData) {
          setMilestones(milestonesData as MilestoneData[]);
        }
        if (specializationData) {
          setSpecializations(specializationData as SpecializationData[]);
        }
        if (profileData) {
          cachedHomeProfile = profileData as FooterProfileData;
          setProfile(cachedHomeProfile);
          try {
            window.localStorage.setItem(homeProfileStorageKey, JSON.stringify(cachedHomeProfile));
          } catch {
          }
        }
      } finally {
        setIsHomeReady(true);
      }
    }

    fetchHomeData();
  }, []);

  const visibleProjects = useMemo(
    () => projects.filter((project) => project.is_featured === true).slice(0, 8),
    [projects]
  );

  const serviceCards = useMemo<SpecializationCardData[]>(() => {
    return specializations.map((item) => {
      return {
        title: item.title,
        description: item.description,
        bullets: item.bullets || [],
        icon: imgSpecRedesign,
        iconClassName: "h-[56px] w-[56px]",
      };
    });
  }, [specializations]);

  function handleSkillTagClick(skill: string) {
    queueWorksTechFilter(skill);
    setCurrentPage("works");
  }

  if (!isHomeReady) {
    return (
      <section className="w-full px-6 pb-12 pt-4 md:px-10 lg:flex lg:min-h-[calc(100vh-120px)] lg:items-center lg:px-[70px] lg:py-0">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center gap-4">
          <div className="h-3 w-[180px] animate-pulse rounded-full bg-primary/40" />
          <p className="text-sm font-medium text-secondary/80">Loading portfolio...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full">
      <HeroSection setCurrentPage={setCurrentPage} profile={profile} />

      <RevealOnScroll delayMs={40}>
        <section className="px-6 pb-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px] rounded-[20px] py-[25px]">
          <h2 className="mb-6 text-center text-[36px] font-bold text-secondary">Specialization</h2>
          <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-3">
            {serviceCards.map((card) => (
              <article
                key={card.title}
                className="group rounded-[20px] border border-primary bg-white p-[20px] shadow-[10px_10px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[14px_14px_0px_0px_var(--color-primary)]"
              >
                <div className="relative mb-4 h-[72px] w-[72px]">
                  <img src={card.icon} alt="" className={`${card.iconClassName} object-contain transition-transform duration-300 ease-out group-hover:scale-110`} />
                  {card.iconOverlay ? (
                    <img src={card.iconOverlay} alt="" className="absolute bottom-1 right-1 h-[24px] w-[24px] object-contain" />
                  ) : null}
                </div>
                <h3 className="mb-3 text-[24px] font-medium text-black">{card.title}</h3>
                <p className="mb-3 text-[18px] font-medium leading-[1.3] text-secondary">{card.description}</p>
                <ul className="list-disc space-y-1 pl-5 text-[18px] font-medium text-secondary">
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="max-w-[840px] text-[14px] font-medium text-secondary">
              Have something specific in mind? Feel free to ask me any questions or let me know exactly what you need.
            </p>
            <button
              onClick={() => setCurrentPage("contact")}
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 active:translate-y-0 active:scale-[0.98] md:px-8 md:text-base"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Inquire
              <img src={imgArrowFilled} alt="" className="ml-3 h-[20px] w-[24px]" />
            </button>
          </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll delayMs={60}>
        <section className="px-6 pb-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
          <h2 className="mb-3 text-center text-[36px] font-bold text-secondary">Projects</h2>
          <div className="mb-5 flex items-center">
            <button
              onClick={() => setCurrentPage("works")}
              className="inline-flex h-[50px] w-[176px] items-center justify-center rounded-[19px] border-[3px] border-primary bg-primary text-[20px] font-semibold leading-none text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 active:scale-[0.98]"
            >
              See All
            </button>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-10 xl:grid-cols-2">
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

      <RevealOnScroll delayMs={80}>
        <section className="px-6 pb-12 md:px-10 lg:px-[70px]">
          <div className="mx-auto max-w-[1300px]">
          <h2 className="mb-6 text-center text-[36px] font-bold text-secondary">Milestones</h2>
          <div className="flex flex-wrap items-center justify-center gap-[30px]">
            {milestones.map((milestone) => (
              <article
                key={milestone.id}
                className="flex h-[130px] w-[300px] flex-col items-center justify-center rounded-[10px] border border-primary bg-white px-[10px] py-[30px] text-center shadow-[10px_10px_0px_0px_var(--color-primary)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[14px_14px_0px_0px_var(--color-primary)]"
              >
                <p className="text-[36px] font-bold text-[#805eff]">{milestone.value}</p>
                <p className="text-[20px] font-medium text-secondary">{milestone.label}</p>
              </article>
            ))}
          </div>
          </div>
        </section>
      </RevealOnScroll>
    </div>
  );
}