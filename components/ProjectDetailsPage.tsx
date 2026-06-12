"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Github, ExternalLink, Play } from "lucide-react";
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
  my_role: string | null;
  features: unknown;
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

const projectDetailsSelect = "id, title, hook, description, thumbnail_url, overview, my_role, features, impact_reflection, live_demo_url, live_project_url, github_repo_url, figma_documentation_url, figma_image_url, project_skills(skill_id, tech_stack(skill_name))";

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
  const [activeFeature, setActiveFeature] = useState<FeatureItem | null>(null);

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
  const hasOverview = Boolean(project?.overview?.trim() || project?.my_role?.trim());
  const hasTools = techStack.length > 0;
  const hasFeatures = featureItems.length > 0;
  const hasDesign = Boolean(project?.hook?.trim());
  const hasDesignPreview = Boolean(project?.figma_image_url?.trim());
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
    if (!activeFeature) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveFeature(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeFeature]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    setActiveFeature(null);
  }, [projectId]);

  if (isLoading) {
    return (
      <section className="w-full px-5 py-6 lg:px-6">
        <div className="mx-auto flex min-h-[380px] w-full max-w-[1200px] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-[15px] font-medium text-secondary">Loading project...</p>
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="w-full px-5 py-6 lg:px-6">
        <div className="mx-auto flex min-h-[380px] w-full max-w-[1200px] flex-col items-center justify-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-3xl">✦</div>
          <p className="text-[22px] font-semibold text-black">Project not found</p>
          <p className="text-[15px] text-secondary">This project may have been moved or removed.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 inline-flex items-center gap-2 rounded-[14px] bg-primary px-6 py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <ArrowLeft size={15} /> Back to Works
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={pageRef} className="w-full bg-transparent px-4 py-4 md:px-5 md:py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mx-auto flex w-full max-w-[1200px] items-start gap-8 lg:gap-10">

          {/* ── Desktop Sidebar ── */}
          <aside
            data-details-reveal
            className="hidden w-[220px] shrink-0 translate-y-5 opacity-0 transition-all duration-700 ease-out lg:sticky lg:top-24 lg:block"
          >
            <button
              type="button"
              onClick={onBack}
              className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-secondary transition-colors hover:text-primary"
            >
              <ArrowLeft size={15} />
              Back to Works
            </button>

            <nav className="space-y-0.5">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSection(item.id, true)}
                  className={`group relative flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium transition-all duration-200 ${
                    activeSidebarItem === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:bg-black/4 hover:text-black"
                  }`}
                >
                  {activeSidebarItem === item.id && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <span className="pl-1">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main Content ── */}
          <article className="min-w-0 w-full flex-1 pb-16">

            {/* Mobile back + sections bar */}
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-secondary transition-colors hover:text-primary"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-[36px] items-center gap-1.5 rounded-[10px] border border-black/12 bg-white px-3 text-[13px] font-semibold text-black/70 shadow-sm transition-all hover:border-primary/30 hover:text-primary"
              >
                <span className="text-[16px] leading-none">☰</span>
                Sections
              </button>
            </div>

            {/* ── Header ── */}
            <div className={`mb-6 transition-all duration-700 ease-out ${
              isPageMounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-black md:text-[34px]">
                  {project.title}
                </h1>
                <div className="flex items-center gap-2">
                  {project.github_repo_url ? (
                    <a
                      href={project.github_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-black/15 bg-white px-4 text-[13px] font-semibold text-black transition-all hover:border-black/30 hover:bg-black/5 active:scale-[0.98]"
                    >
                      <Github size={15} />
                      GitHub
                    </a>
                  ) : null}
                  {project.live_demo_url ? (
                    <a
                      href={project.live_demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <Play size={13} fill="currentColor" />
                      Watch Demo
                    </a>
                  ) : null}
                </div>
              </div>

              <p className={`max-w-[680px] text-[16px] leading-[1.6] text-secondary transition-all duration-700 delay-75 ease-out ${
                isPageMounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}>
                {project.description}
              </p>
            </div>

            {/* ── Hero Image ── */}
            <div
              className={`group relative mb-14 overflow-hidden rounded-[18px] bg-[#F0EFF5] transition-all duration-700 delay-100 ease-out ${
                isPageMounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              } ${project.live_project_url ? "cursor-pointer" : ""}`}
              style={{ aspectRatio: "16/8" }}
            >
              {project.thumbnail_url ? (
                <img
                  src={project.thumbnail_url}
                  alt={project.title || "Project image"}
                  className="h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                />
              ) : null}
              {project.live_project_url ? (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/8 rounded-[18px]" />
                  <a
                    href={project.live_project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open live project"
                    className="absolute inset-0 z-[2]"
                  >
                    <span className="absolute bottom-4 right-4 inline-flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 active:scale-95">
                      <ArrowUpRight size={20} />
                    </span>
                  </a>
                </>
              ) : null}
            </div>

            {/* ── Divider line ── */}
            <div className="mb-14 h-px w-full bg-black/8" />

            {/* ── Overview ── */}
            {hasOverview ? (
              <section
                id="overview"
                data-details-reveal
                className="mb-14 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out"
              >
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary">Overview</p>
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div>
                    {project.overview ? (
                      <div className="rounded-[16px] border border-black/8 bg-black/[0.02] p-7 md:p-8">
                        <p className="max-w-[820px] text-[20px] font-medium leading-[1.4] tracking-[-0.01em] text-black/75 md:text-[24px]">
                          {project.overview}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {(project.my_role || ownerName) ? (
                    <div className="rounded-[14px] border border-black/8 bg-white/80 p-5 backdrop-blur-sm">
                      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-secondary">Role</p>
                      {project.my_role ? (
                        <p className="text-[18px] font-semibold leading-[1.2] text-black">
                          {project.my_role}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* ── Engineering Stack ── */}
            {hasTools ? (
              <section
                id="tools"
                data-details-reveal
                className="mb-14 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out"
              >
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary">Engineering Stack</p>
                <div className="flex flex-wrap gap-2">
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

            {/* ── Key Features ── */}
            {hasFeatures ? (
              <section
                id="features"
                data-details-reveal
                className="mb-14 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out"
              >
                <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary">Key Features</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {featureItems.map((feature, index) => {
                    const isLongDescription = feature.description.length > 140;

                    return (
                      <article
                        key={`${feature.title}-${feature.description}-${index}`}
                        style={{ transitionDelay: `${Math.min(index, 7) * 55}ms` }}
                        className="group flex flex-col gap-3 rounded-[16px] border border-black/8 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                      >
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/8 text-[15px] text-primary transition-transform duration-300 group-hover:scale-110">
                          ◔
                        </div>
                        <h3 className="text-[14px] font-semibold leading-[1.3] text-black">{feature.title}</h3>
                        {feature.description ? (
                          <p className="line-clamp-5 text-[13px] leading-[1.5] text-secondary">{feature.description}</p>
                        ) : null}
                        {isLongDescription ? (
                          <button
                            type="button"
                            onClick={() => setActiveFeature(feature)}
                            className="mt-auto inline-flex h-9 items-center self-start rounded-[10px] px-3 text-[12px] font-semibold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
                          >
                            Read full details
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* ── Design ── */}
            {hasDesign ? (
              <section
                id="design"
                data-details-reveal
                className="mb-14 scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out"
              >
                <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary">Design</p>
                <div className={`flex flex-col gap-8 md:flex-row md:items-start md:gap-10 ${
                  hasDesignPreview ? "" : "max-w-[760px]"
                }`}>
                  <div className="min-w-0 flex-1">
                    {project.hook ? (
                      <div className="mb-6 rounded-[16px] border border-black/8 bg-black/[0.02] p-7 md:p-8">
                        <p className="max-w-[820px] text-[20px] font-medium leading-[1.4] tracking-[-0.01em] text-black/75 md:text-[24px]">
                          {project.hook}
                        </p>
                      </div>
                    ) : null}
                    {project.figma_documentation_url ? (
                      <a
                        href={project.figma_documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 self-start rounded-[10px] border border-black/12 px-4 py-2.5 text-[13px] font-semibold text-black/70 transition-all hover:border-primary/30 hover:text-primary"
                      >
                        View Documentation <ExternalLink size={13} />
                      </a>
                    ) : null}
                  </div>

                  {hasDesignPreview ? (
                    <div className="min-w-0 flex-1">
                      <div className="group relative overflow-hidden rounded-[16px] border border-black/8 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10)]" style={{ aspectRatio: "4/3" }}>
                        <img
                          src={project.figma_image_url || ""}
                          alt={project.title || "Design preview"}
                          className="h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                        />
                      </div>
                      <p className="mt-2 text-[12px] text-secondary">Preview</p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* ── Final Result ── */}
            {hasResult ? (
              <section
                id="result"
                data-details-reveal
                className="scroll-mt-28 translate-y-5 opacity-0 transition-all duration-700 ease-out"
              >
                <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary">Final Result</p>
                <div className="rounded-[16px] border border-black/8 bg-black/[0.02] p-7 md:p-8">
                  <p className="max-w-[820px] text-[20px] font-medium leading-[1.4] tracking-[-0.01em] text-black/75 md:text-[24px]">
                    {project.impact_reflection}
                  </p>
                </div>
              </section>
            ) : null}
          </article>
        </div>
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="h-full w-full"
              aria-label="Close sections backdrop"
            />
          </div>
          <div className="absolute left-0 top-0 h-full w-full max-w-[300px] overflow-y-auto bg-white px-5 py-5 shadow-[16px_0_48px_rgba(0,0,0,0.12)]">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[15px] font-bold text-black">Sections</p>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/12 text-[15px] text-secondary transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Close sections"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={`mobile-${item.id}`}
                  type="button"
                  onClick={() => {
                    goToSection(item.id, true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex h-[42px] w-full items-center rounded-[10px] px-3 text-left text-[14px] font-medium transition-all ${
                    activeSidebarItem === item.id
                      ? "bg-primary text-white"
                      : "text-secondary hover:bg-black/5 hover:text-black"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {activeFeature ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setActiveFeature(null)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close feature details"
          />
          <div className="relative z-[1] max-h-[min(620px,calc(100vh-48px))] w-full max-w-[560px] overflow-y-auto rounded-[20px] bg-white p-6 shadow-[0_24px_80px_rgba(15,24,51,0.24)] md:p-7">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Feature</p>
                <h3 className="text-[22px] font-semibold leading-tight text-black">{activeFeature.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-black/10 text-[15px] text-secondary transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Close feature details"
              >
                ✕
              </button>
            </div>
            <p className="whitespace-pre-line text-[15px] leading-[1.75] text-secondary">
              {activeFeature.description}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}