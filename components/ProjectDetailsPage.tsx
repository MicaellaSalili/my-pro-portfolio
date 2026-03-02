"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
  figma_documentation_url: string | null;
  figma_image_url: string | null;
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

type FeatureItem = {
  title: string;
  description: string;
};

const projectDetailsSelect = "id, title, hook, description, thumbnail_url, overview, goal, my_role, features, design_philosophy, impact_reflection, live_demo_url, live_project_url, github_repo_url, figma_documentation_url, figma_image_url, project_skills(skill_id, tech_stack(skill_name))";

const projectDetailsCache = new Map<string, ProjectDetailsData>();
const projectDetailsPending = new Map<string, Promise<ProjectDetailsData | null>>();

let ownerNameCache: string | null = null;
let ownerNamePending: Promise<string> | null = null;

function fetchProjectDetailsById(projectId: string): Promise<ProjectDetailsData | null> {
  if (projectDetailsCache.has(projectId)) {
    return Promise.resolve(projectDetailsCache.get(projectId) || null);
  }

  const pendingRequest = projectDetailsPending.get(projectId);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select(projectDetailsSelect)
        .eq("id", projectId)
        .maybeSingle();

      const projectData = (data as ProjectDetailsData | null) || null;
      if (projectData) {
        projectDetailsCache.set(projectId, projectData);
      }

      return projectData;
    } finally {
      projectDetailsPending.delete(projectId);
    }
  })();

  projectDetailsPending.set(projectId, request);
  return request;
}

function fetchOwnerName(): Promise<string> {
  if (ownerNameCache !== null) {
    return Promise.resolve(ownerNameCache);
  }

  if (ownerNamePending) {
    return ownerNamePending;
  }

  const request = (async () => {
    try {
      const { data } = await supabase
        .from("profile")
        .select("name")
        .limit(1)
        .maybeSingle();

      const name = ((data as ProfileData | null)?.name || "").trim();
      ownerNameCache = name;
      return name;
    } finally {
      ownerNamePending = null;
    }
  })();

  ownerNamePending = request;
  return request;
}

export async function prefetchProjectDetails(projectId: string) {
  if (!projectId.trim()) {
    return;
  }

  await Promise.all([fetchProjectDetailsById(projectId), fetchOwnerName()]);
}

function parseFeatureItems(value: unknown): FeatureItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (!trimmed) {
            return null;
          }

          return {
            title: "Feature",
            description: trimmed,
          };
        }

        if (item && typeof item === "object") {
          const rawTitle = (item as { title?: unknown }).title;
          const rawDescription = (item as { description?: unknown }).description;

          const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
          const description = typeof rawDescription === "string" ? rawDescription.trim() : "";

          if (title || description) {
            return {
              title: title || "Feature",
              description,
            };
          }
        }

        return null;
      })
      .filter((item): item is FeatureItem => Boolean(item));
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        title: "Feature",
        description: item,
      }));
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
  const pageRef = useRef<HTMLElement | null>(null);
  const [project, setProject] = useState<ProjectDetailsData | null>(() => {
    if (!projectId) {
      return null;
    }

    return projectDetailsCache.get(projectId) || null;
  });
  const [ownerName, setOwnerName] = useState<string>(() => ownerNameCache || "");
  const [isLoading, setIsLoading] = useState(() => {
    if (!projectId) {
      return false;
    }

    return !projectDetailsCache.has(projectId);
  });
  const [activeSidebarItem, setActiveSidebarItem] = useState("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPageMounted, setIsPageMounted] = useState(false);

  useEffect(() => {
    setIsPageMounted(false);
    const timeoutId = window.setTimeout(() => setIsPageMounted(true), 30);
    return () => window.clearTimeout(timeoutId);
  }, [projectId]);

  useEffect(() => {
    const rootElement = pageRef.current;
    if (!rootElement || isLoading) {
      return;
    }

    const revealElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>("[data-details-reveal]")
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
  }, [isLoading, projectId, project]);

  useEffect(() => {
    let isUnmounted = false;

    async function fetchDetails() {
      if (!projectId) {
        setProject(null);
        setIsLoading(false);
        return;
      }

      const cachedProject = projectDetailsCache.get(projectId) || null;
      if (cachedProject) {
        setProject(cachedProject);
      }

      if (ownerNameCache !== null) {
        setOwnerName(ownerNameCache);
      }

      if (cachedProject && ownerNameCache !== null) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [projectData, resolvedOwnerName] = await Promise.all([
          fetchProjectDetailsById(projectId),
          fetchOwnerName(),
        ]);

        if (isUnmounted) {
          return;
        }

        setProject(projectData);
        setOwnerName(resolvedOwnerName);
      } finally {
        if (!isUnmounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      isUnmounted = true;
    };
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

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [projectId]);

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
    <section ref={pageRef} className="w-full bg-transparent px-4 py-4 md:px-5 md:py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1440px]">
          <div className="mx-auto flex w-full max-w-[1200px] items-start gap-6 lg:gap-8">
          <aside data-details-reveal className="hidden w-[242px] shrink-0 translate-y-5 opacity-0 transition-all duration-700 ease-out lg:sticky lg:top-24 lg:block">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1.5 text-left text-[20px] font-bold leading-none text-primary transition-opacity hover:opacity-80"
            >
              <ArrowLeft size={20} /> Back to Works
            </button>
            <div className="space-y-1.5">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    goToSection(item.id, true);
                  }}
                  className={`block min-h-[40px] w-full rounded-[20px] px-4 py-1.5 text-left text-[22px] leading-none transition-all ${
                    activeSidebarItem === item.id
                      ? "bg-primary font-medium text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                      : "font-normal text-secondary hover:text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <article className="min-w-0 w-full flex-1">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1.5 text-left text-[18px] font-bold text-primary transition-opacity hover:opacity-80 lg:hidden"
            >
              <ArrowLeft size={18} /> Back to Works
            </button>

            <div className="mb-4 flex items-center justify-start lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-[42px] items-center gap-2 rounded-[20px] border border-primary/20 bg-white px-4 text-[14px] font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                <span className="text-[18px] leading-none">☰</span>
                Sections
              </button>
            </div>

            <div className={`mb-5 flex flex-wrap items-center justify-between gap-4 transition-all duration-700 ease-out ${
              isPageMounted ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}>
              <h1 className="break-words text-[36px] font-bold leading-none text-black transition-transform duration-300 hover:translate-x-0.5">{project.title}</h1>
              <div className="flex items-center gap-3">
                {project.github_repo_url ? (
                  <a
                    href={project.github_repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[43px] items-center rounded-[14px] bg-black px-5 text-[14px] font-semibold text-white"
                  >
                    Code
                  </a>
                ) : null}
                {project.live_demo_url ? (
                  <a
                    href={project.live_demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[43px] items-center rounded-[14px] bg-primary px-5 text-[14px] font-semibold text-white"
                  >
                    Watch
                  </a>
                ) : null}
              </div>
            </div>

            <p className={`mb-6 max-w-[780px] break-words text-[20px] font-medium leading-[1.2] text-secondary transition-all duration-700 delay-75 ease-out ${
              isPageMounted ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}>
              {project.description}
            </p>

            <div
              className={`group relative mb-12 h-[300px] w-full overflow-hidden bg-[#E3E3E3] sm:h-[360px] ${
                project.live_project_url ? "cursor-pointer" : ""
              } transition-all duration-700 delay-100 ease-out ${isPageMounted ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
            >
              {project.thumbnail_url ? (
                <img
                  src={project.thumbnail_url}
                  alt={project.title || "Project image"}
                  className="h-full w-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                />
              ) : null}
              {project.live_project_url ? (
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              ) : null}
              {project.live_project_url ? (
                <a
                  href={project.live_project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open live project website"
                  className="absolute inset-0 z-[2]"
                >
                  <span className="absolute bottom-4 right-4 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-white shadow-[0px_4px_20px_0px_rgba(163,134,255,0.5)] transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 active:scale-95">
                    <ArrowUpRight size={24} />
                  </span>
                </a>
              ) : null}
            </div>

            {hasOverview ? (
              <section id="overview" data-details-reveal className="mb-12 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
                <h2 className="mb-5 text-[24px] font-bold uppercase tracking-[0.34em] text-primary">Overview</h2>
                <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    {project.overview ? (
                      <h3 className="max-w-[620px] text-[32px] font-medium leading-[1] text-black">{project.overview}</h3>
                    ) : null}
                    {project.goal ? (
                      <p className="mt-4 max-w-[620px] text-[20px] font-medium leading-[1.2] text-secondary">{project.goal}</p>
                    ) : null}
                  </div>

                  {project.my_role || ownerName ? (
                    <article className="rounded-[14px] bg-white p-4">
                      {ownerName ? (
                        <div className="mb-3 flex items-center gap-2 border-b border-black/15 pb-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
                            {ownerName.charAt(0).toUpperCase()}
                          </span>
                          <p className="text-[11px] font-bold text-secondary">{ownerName}</p>
                        </div>
                      ) : null}
                      {project.my_role ? (
                        <p className="text-[32px] font-bold leading-[1.05] text-secondary">{project.my_role}</p>
                      ) : null}
                    </article>
                  ) : null}
                </div>
              </section>
            ) : null}

            {hasTools ? (
              <section id="tools" data-details-reveal className="mb-12 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
                <h2 className="mb-5 text-[24px] font-bold uppercase tracking-[0.34em] text-primary">Engineering Stack</h2>
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
              <section id="features" data-details-reveal className="mb-12 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
                <h2 className="mb-5 text-[24px] font-bold uppercase tracking-[0.34em] text-primary">Key Features</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {featureItems.map((feature, index) => (
                    <article
                      key={`${feature.title}-${feature.description}-${index}`}
                      style={{ transitionDelay: `${Math.min(index, 7) * 60}ms` }}
                      className="group rounded-[22px] bg-white p-5 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-primary)]"
                    >
                      <span className="mb-3 inline-flex h-[42px] w-[42px] items-center justify-center rounded-[8px] bg-primary/20 text-primary transition-transform duration-300 group-hover:rotate-6">◔</span>
                      <h3 className="mb-2 break-words text-[18px] font-bold text-black">{feature.title}</h3>
                      {feature.description ? (
                        <p className="line-clamp-6 break-words text-[12px] leading-[1.15] text-secondary">{feature.description}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {hasDesign ? (
              <section id="design" data-details-reveal className="mb-12 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out">
                <h2 className="mb-5 text-[24px] font-bold uppercase tracking-[0.34em] text-primary">UI/UX Design</h2>
                <div className="flex flex-col gap-8 md:flex-row md:gap-10 items-start">
                  <div className="flex-1 min-w-0">
                    {project.hook ? (
                      <h3 className="max-w-[420px] text-[36px] font-bold leading-[1.02] text-black mb-4">{project.hook}</h3>
                    ) : null}
                    {project.design_philosophy ? (
                      <p className="max-w-[380px] text-[22px] font-medium leading-[1.3] text-secondary mb-6">{project.design_philosophy}</p>
                    ) : null}

                    {project.figma_documentation_url ? (
                      <a
                        href={project.figma_documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-[18px] font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        <span className="underline">Explore Figma Documentation</span> <ArrowUpRight size={16} />
                      </a>
                    ) : null}
                  </div>

                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-2 h-[300px] w-full max-w-[540px] overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white shadow-lg transition-transform duration-300 hover:scale-[1.015] group">
                      {project.figma_image_url ? (
                        <img
                          src={project.figma_image_url}
                          alt={project.title || "Project design preview"}
                          className="h-full w-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">No Figma preview</div>
                      )}
                    </div>
                    {project.figma_documentation_url ? (
                      <div className="mt-1 text-[14px] text-gray-500 text-center w-full max-w-[540px]">Figma preview from documentation</div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {hasResult ? (
              <section id="result" data-details-reveal className="scroll-mt-28 pb-6 translate-y-5 opacity-0 transition-all duration-700 ease-out">
                <h2 className="mb-5 text-[24px] font-bold uppercase tracking-[0.34em] text-primary">Final Result</h2>
                <h3 className="mb-3 text-[48px] font-bold leading-none text-black">Reflection</h3>
                <p className="max-w-[900px] text-[38px] font-medium leading-[1.05] text-secondary">{project.impact_reflection}</p>
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
