"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HeroSection from "./HeroSection";
import { supabase } from "../lib/supabase";

interface HomePageProps {
  setCurrentPage: (page: string) => void;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category?: string | null;
  live_demo_url?: string;
  github_repo_url?: string;
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
const imgProjectPlaceholder = "/assets/home/project-placeholder.svg";
const imgArrowFilled = "/assets/hero/icon-arrow.svg";

function ProjectCard({
  project,
  wide,
}: {
  project: ProjectData;
  wide?: boolean;
}) {
  return (
    <article className={`group rounded-[30px] bg-white p-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0px_14px_28px_0px_rgba(0,0,0,0.2)] ${wide ? "w-full lg:w-[640px]" : "w-full md:w-[48%] lg:w-[420px]"}`}>
      <div className={`${wide ? "flex h-auto flex-col lg:h-[300px] lg:flex-row lg:items-center lg:justify-between" : "flex h-[320px] flex-col items-center justify-between"}`}>
        <div className={`${wide ? "h-[170px] w-full overflow-hidden rounded-[12px] bg-[rgba(247,245,245,0.8)] lg:h-[300px] lg:w-[380px]" : "h-[170px] w-full overflow-hidden rounded-[12px] bg-[rgba(247,245,245,0.8)]"}`}>
          <img
            src={project.thumbnail_url || imgProjectPlaceholder}
            alt={project.title}
            className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className={`${wide ? "h-auto w-full bg-[rgba(247,245,245,0.5)] p-[10px] lg:flex lg:h-[300px] lg:w-[218px] lg:flex-col lg:justify-center" : "h-[130px] w-full bg-[rgba(247,245,245,0.5)] p-[10px]"}`}>
          <h3 className={`mb-2 font-bold leading-none text-black ${wide ? "text-center text-[24px]" : "text-center text-[24px]"}`}>
            {project.title}
          </h3>
          <p className={`font-medium leading-[1.05] text-black ${wide ? "line-clamp-6 text-[20px]" : "line-clamp-3 text-[20px]"}`}>
            {project.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function HomePage({ setCurrentPage }: HomePageProps) {
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
          .select("name, hero_title, hero_sub_headline, profile_image_url")
          .single();

        const [{ data: projectsData }, { data: milestonesData }, { data: specializationData }, { data: profileData }] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, description, thumbnail_url, category, live_demo_url, github_repo_url")
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

  const topRowProjects = useMemo(() => projects.slice(0, 3), [projects]);
  const middleRowProjects = useMemo(() => projects.slice(3, 5), [projects]);
  const bottomRowProjects = useMemo(() => projects.slice(5, 8), [projects]);

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

          <div className="space-y-6">
            <div className="grid grid-cols-1 justify-items-center gap-6 lg:grid-cols-3">
              {topRowProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            <div className="grid grid-cols-1 justify-items-center gap-6 lg:grid-cols-2">
              {middleRowProjects.map((project) => (
                <ProjectCard key={project.id} project={project} wide />
              ))}
            </div>

            <div className="grid grid-cols-1 justify-items-center gap-6 lg:grid-cols-3">
              {bottomRowProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
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