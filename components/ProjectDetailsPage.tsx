"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { queueWorksTechFilter } from "../lib/worksTechFilter";
import SkillTag from "./SkillTag";

type ProjectDetailsData = {
  id: string;
  title: string | null;
  hook: string | null;
  description: string | null;
  thumbnail_url: string | null;
  overview: string | null;
  goal: string | null;
  my_role: string | null;
  features: unknown;
  design_philosophy: string | null;
  impact_reflection: string | null;
  live_demo_url: string | null;
  live_project_url: string | null;
  github_repo_url: string | null;
  project_skills?: {
    skill_id?: string;
    tech_stack?: {
      skill_name?: string | null;
    } | null;
  }[];
};

type ProfileData = {
  name?: string | null;
};

function parseFeatureItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          const candidate = (item as { title?: unknown; description?: unknown }).title;
          if (typeof candidate === "string") {
            return candidate.trim();
          }

          const fallback = (item as { description?: unknown }).description;
          if (typeof fallback === "string") {
            return fallback.trim();
          }
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function ProjectDetailsPage({
  projectId,
  onBack,
}: {
  projectId: string | null;
  onBack: () => void;
}) {
  const [project, setProject] = useState<ProjectDetailsData | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [{ data: projectData }, { data: profileData }] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, hook, description, thumbnail_url, overview, goal, my_role, features, design_philosophy, impact_reflection, live_demo_url, live_project_url, github_repo_url, project_skills(skill_id, tech_stack(skill_name))")
            .eq("id", projectId)
            .maybeSingle(),
          supabase.from("profile").select("name").limit(1).maybeSingle(),
        ]);

        if (projectData) {
          setProject(projectData as ProjectDetailsData);
        }

        if (profileData) {
          setOwnerName(((profileData as ProfileData).name || "").trim());
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [projectId]);

  const techStack = useMemo(() => {
    if (!project) {
      return [] as string[];
    }

    return (project.project_skills || [])
      .map((item) => item.tech_stack?.skill_name?.trim() || "")
      .filter(Boolean);
  }, [project]);

  const featureItems = useMemo(() => parseFeatureItems(project?.features), [project]);
  const hasOverview = Boolean(project?.overview?.trim() || project?.goal?.trim() || project?.my_role?.trim() || ownerName);
  const hasTools = techStack.length > 0;
  const hasFeatures = featureItems.length > 0;
  const hasDesign = Boolean(project?.hook?.trim() || project?.design_philosophy?.trim());
  const hasResult = Boolean(project?.impact_reflection?.trim());

  const sidebarItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];

    if (hasOverview) {
      items.push({ id: "overview", label: "Overview" });
    }
    if (hasTools) {
      items.push({ id: "tools", label: "Tools" });
    }
    if (hasFeatures) {
      items.push({ id: "features", label: "Key Features" });
    }
    if (hasDesign) {
      items.push({ id: "design", label: "UI/UX Design" });
    }
    if (hasResult) {
      items.push({ id: "result", label: "Final Result" });
    }

    return items;
  }, [hasOverview, hasTools, hasFeatures, hasDesign, hasResult]);

  function goToSection(sectionId: string, smooth = true) {
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) {
      return false;
    }

    setActiveSidebarItem(sectionId);
    sectionElement.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });

    if (typeof window !== "undefined" && window.location.hash) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    return true;
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [projectId]);

  useEffect(() => {
    if (sidebarItems.length > 0) {
      setActiveSidebarItem(sidebarItems[0].id);
    }
  }, [sidebarItems]);

  useEffect(() => {
    if (sidebarItems.length === 0) {
      return;
    }

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
  }, [sidebarItems]);

  if (isLoading) {
    return (
      <section className="w-full px-5 py-6 lg:px-6">
        <div className="mx-auto flex min-h-[380px] w-full max-w-[1200px] items-center justify-center text-[24px] font-medium text-secondary">
          Loading project details...
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="w-full px-5 py-6 lg:px-6">
        <div className="mx-auto flex min-h-[380px] w-full max-w-[1200px] flex-col items-center justify-center gap-5">
          <p className="text-[24px] font-medium text-secondary">Project not found.</p>
          <button
            type="button"
            onClick={onBack}
            className="rounded-[14px] bg-primary px-6 py-3 text-[16px] font-semibold text-white"
          >
            Back to Works
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-transparent px-5 py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mx-auto flex w-full max-w-[1200px] items-start gap-8 lg:gap-10">
          <aside className="hidden w-[230px] shrink-0 lg:block lg:sticky lg:top-24">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 text-left text-[16px] font-bold text-primary transition-opacity hover:opacity-80"
            >
              ← Back to Works
            </button>
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    goToSection(item.id, true);
                  }}
                  className={`block w-full rounded-[14px] px-4 py-2 text-left text-[16px] transition-all ${
                    activeSidebarItem === item.id
                      ? "bg-primary font-semibold text-white"
                      : "font-medium text-secondary hover:text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <article className="w-full max-w-[920px]">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 text-left text-[16px] font-bold text-primary transition-opacity hover:opacity-80 lg:hidden"
            >
              ← Back to Works
            </button>

            <div className="mb-4 flex items-center justify-start lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-primary bg-white px-4 text-[14px] font-semibold text-primary shadow-[0_6px_16px_rgba(128,94,255,0.2)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                <span className="text-[18px] leading-none">☰</span>
                Sections
              </button>
            </div>

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-[42px] font-bold leading-none text-black">{project.title}</h1>
              <div className="flex items-center gap-3">
                {project.github_repo_url ? (
                  <a
                    href={project.github_repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[12px] bg-black px-4 py-2 text-[14px] font-semibold text-white"
                  >
                    code
                  </a>
                ) : null}
                {project.live_demo_url ? (
                  <a
                    href={project.live_demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[12px] bg-primary px-4 py-2 text-[14px] font-semibold text-white"
                  >
                    Watch
                  </a>
                ) : null}
              </div>
            </div>

            <p className="mb-6 max-w-[780px] text-[20px] font-medium leading-[1.25] text-secondary">
              {project.description}
            </p>

            <div className="relative mb-10 h-[360px] w-full overflow-hidden rounded-[2px] bg-[#E3E3E3]">
              {project.thumbnail_url ? (
                <img src={project.thumbnail_url} alt={project.title || "Project image"} className="h-full w-full object-contain object-center" />
              ) : null}
              {project.live_project_url ? (
                <a
                  href={project.live_project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open live project website"
                  className="absolute left-1/2 top-1/2 inline-flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-primary text-[22px] font-semibold leading-none text-white shadow-[0_10px_20px_rgba(128,94,255,0.35)] transition-all duration-200 hover:scale-105 hover:opacity-95 active:scale-95"
                >
                  ↗
                </a>
              ) : null}
            </div>

            {hasOverview ? (
              <section id="overview" className="mb-12 scroll-mt-28">
                <h2 className="mb-4 text-[24px] font-bold uppercase tracking-[0.22em] text-primary">Overview</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    {project.overview ? (
                      <h3 className="text-[38px] font-medium leading-[1.05] text-black">{project.overview}</h3>
                    ) : null}
                    {project.goal ? (
                      <p className="mt-5 text-[20px] font-medium leading-[1.25] text-secondary">{project.goal}</p>
                    ) : null}
                  </div>
                  {project.my_role || ownerName ? (
                    <article className="rounded-[14px] bg-white p-4">
                      {ownerName ? (
                        <div className="mb-3 flex items-center gap-2 border-b border-black/15 pb-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
                            {ownerName.charAt(0).toUpperCase()}
                          </span>
                          <p className="text-[13px] font-bold text-secondary">{ownerName}</p>
                        </div>
                      ) : null}
                      {project.my_role ? (
                        <p className="text-[22px] font-bold leading-[1.15] text-secondary">{project.my_role}</p>
                      ) : null}
                    </article>
                  ) : null}
                </div>
              </section>
            ) : null}

            {hasTools ? (
              <section id="tools" className="mb-12 scroll-mt-28">
                <h2 className="mb-4 text-[24px] font-bold uppercase tracking-[0.22em] text-primary">Engineering Stack</h2>
                <div className="flex flex-wrap gap-3">
                  {techStack.map((tech, index) => (
                    <SkillTag
                      onClick={() => {
                        queueWorksTechFilter(tech);
                        onBack();
                      }}
                      key={`${tech}-${index}`}
                      label={tech}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {hasFeatures ? (
              <section id="features" className="mb-12 scroll-mt-28">
                <h2 className="mb-4 text-[24px] font-bold uppercase tracking-[0.22em] text-primary">Key Features</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {featureItems.map((feature, index) => (
                    <article key={`${feature}-${index}`} className="rounded-[20px] bg-white p-5 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.25)]">
                      <span className="mb-3 inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-primary/20 text-primary">◔</span>
                      <h3 className="mb-2 text-[18px] font-bold text-black">Feature</h3>
                      <p className="line-clamp-6 text-[12px] leading-relaxed text-secondary">{feature}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {hasDesign ? (
              <section id="design" className="mb-12 scroll-mt-28">
                <h2 className="mb-4 text-[24px] font-bold uppercase tracking-[0.22em] text-primary">UI/UX Design</h2>
                <div className="grid grid-cols-1 gap-6">
                  {project.hook ? (
                    <h3 className="text-[42px] font-bold leading-[1.03] text-black">{project.hook}</h3>
                  ) : null}
                  {project.design_philosophy ? (
                    <p className="text-[18px] font-medium leading-[1.25] text-secondary">{project.design_philosophy}</p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {hasResult ? (
              <section id="result" className="scroll-mt-28">
                <h2 className="mb-4 text-[24px] font-bold uppercase tracking-[0.22em] text-primary">Final Result</h2>
                <h3 className="mb-2 text-[48px] font-bold leading-none text-black">Impact</h3>
                <p className="text-[38px] font-medium leading-[1.05] text-secondary">{project.impact_reflection}</p>
              </section>
            ) : null}
          </article>
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
              <h3 className="text-[16px] font-bold text-black">Project Sections</h3>
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
                        ? "border-primary bg-primary font-bold text-white shadow-[0_6px_18px_rgba(128,94,255,0.35)]"
                        : "border-[#DCE0E8] bg-transparent font-semibold text-secondary"
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
    </section>
  );
}
