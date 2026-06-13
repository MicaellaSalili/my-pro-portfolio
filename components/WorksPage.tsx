"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import SkillTag from "./SkillTag";
import {
  WORKS_TECH_FILTER_EVENT,
  WORKS_TECH_FILTER_STORAGE_KEY,
  queueWorksTechFilter,
} from "../lib/worksTechFilter";
import { WORKS_CATEGORY_EVENT, WORKS_CATEGORY_STORAGE_KEY } from "../lib/worksCategoryNav";

type ProjectCardData = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  projectType: string | null;
  techStack: string[];
  category: string | null;
  liveDemoUrl: string | null;
  githubRepoUrl: string | null;
  project_skills?: {
    skill_id?: string;
    tech_stack?: {
      skill_name?: string | null;
    } | null;
  }[];
};

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  project_type: string | null;
  category: string | null;
  live_demo_url: string | null;
  github_repo_url: string | null;
  project_skills?: {
    skill_id?: string;
    tech_stack?: {
      skill_name?: string | null;
    } | null;
  }[];
};

const defaultCategories = [
  "All",
  "Web",
  "Mobile",
  "Systems & Desktop",
  "Cloud & DevOps",
  "AI & ML",
  "Data & Analytics",
  "Cybersecurity",
];

const projectTypeOptions = ["All", "Personal", "Client", "School"];

let worksProjectsCache: ProjectCardData[] | null = null;
let worksProjectsPending: Promise<ProjectCardData[]> | null = null;

function parseProjectCategoryTechStack(value: string | null) {
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

async function fetchWorksProjectsFromServer(): Promise<ProjectCardData[]> {
  const { data } = await supabase
    .from("projects")
    .select("id, title, description, thumbnail_url, project_type, category, live_demo_url, github_repo_url, project_skills(skill_id, tech_stack(skill_name))")
    .order("created_at", { ascending: false });

  return (data as ProjectRow[] | null)?.map((project) => {
    const relatedSkills = (project.project_skills || [])
      .map((item) => item.tech_stack?.skill_name?.trim() || "")
      .filter(Boolean);

    const tags = relatedSkills.length > 0 ? relatedSkills : parseProjectCategoryTechStack(project.category);

    return {
      id: project.id,
      title: project.title || "Untitled Project",
      description: project.description || "No description available.",
      thumbnailUrl: project.thumbnail_url || "",
      projectType: project.project_type,
      techStack: tags,
      category: project.category,
      liveDemoUrl: project.live_demo_url,
      githubRepoUrl: project.github_repo_url,
      project_skills: project.project_skills || [],
    };
  }) || [];
}

export function prefetchWorksPageData(): Promise<ProjectCardData[]> {
  if (worksProjectsCache) {
    return Promise.resolve(worksProjectsCache);
  }

  if (worksProjectsPending) {
    return worksProjectsPending;
  }

  const request = (async () => {
    try {
      const projects = await fetchWorksProjectsFromServer();
      worksProjectsCache = projects;
      return projects;
    } finally {
      worksProjectsPending = null;
    }
  })();

  worksProjectsPending = request;
  return request;
}

function normalizeProjectType(value: string | null) {
  return (value || "").trim().toLowerCase();
}

function toProjectTypeValue(label: string) {
  if (label === "Personal") {
    return "Personal Project";
  }

  if (label === "Client") {
    return "Client Project";
  }

  if (label === "School") {
    return "School Project";
  }

  return label;
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
  onOpenProjectDetails,
  onClickSkillTag,
}: {
  project: ProjectCardData;
  onOpenProjectDetails: (projectId: string) => void;
  onClickSkillTag: (skill: string) => void;
}) {
  const [showAllTech, setShowAllTech] = useState(false);
  const hasMoreTech = project.techStack.length > 3;
  const hiddenTechCount = Math.max(project.techStack.length - 3, 0);
  const visibleTechStack = showAllTech || !hasMoreTech ? project.techStack : project.techStack.slice(0, 3);

  return (
    <article
      onClick={() => onOpenProjectDetails(project.id)}
      className="group relative flex w-full cursor-pointer flex-col rounded-[34px] border border-[rgba(163,134,255,0.28)] bg-white p-5 shadow-[8px_8px_0px_0px_var(--color-primary)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--color-primary)] active:translate-y-0 active:scale-[0.99] sm:p-6 md:p-8"
      style={{ height: "480px" }}
    >
      {/* Tags row — fixed height area */}
      <div className="mb-4 flex h-[36px] shrink-0 flex-wrap items-center gap-2 overflow-hidden">
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
            className="inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-primary/15 px-2 text-[14px] font-semibold leading-none text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/25 active:translate-y-0 active:scale-95"
            aria-label={showAllTech ? "Show fewer tech skills" : `Show ${hiddenTechCount} more tech skills`}
          >
            {showAllTech ? "−" : `+${hiddenTechCount}`}
          </button>
        ) : null}
      </div>

      {/* Thumbnail — fixed height */}
      <div className="relative mb-6 h-[200px] w-full shrink-0 overflow-hidden rounded-[18px] bg-[#F0EFF5]">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="h-full w-full object-contain object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ProjectImageIcon />
          </div>
        )}

        <button
          type="button"
          aria-label={`Open project details for ${project.title}`}
          onClick={() => onOpenProjectDetails(project.id)}
          className="absolute bottom-3 right-3 inline-flex h-[40px] w-[40px] items-center justify-center rounded-[12px] bg-primary text-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 hover:opacity-90 active:translate-y-0 active:scale-95 sm:h-[44px] sm:w-[44px] sm:rounded-[14px]"
        >
          <ArrowUpRight size={20} />
        </button>
      </div>

      {/* Text — fills remaining space, content clipped */}
      <div className="flex min-h-0 flex-1 flex-col justify-end">
        <h3 className="line-clamp-2 text-left text-[30px] font-extrabold leading-[1.06] text-black sm:text-[34px] md:text-[38px]">
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-left text-[14px] font-medium leading-relaxed text-secondary sm:text-[15px]">
          {project.description}
        </p>
      </div>
    </article>
  );
}

export default function WorksPage({
  onOpenProjectDetails,
}: {
  onOpenProjectDetails: (projectId: string) => void;
}) {
  const pageRef = useRef<HTMLElement | null>(null);
  const [projects, setProjects] = useState<ProjectCardData[]>(worksProjectsCache || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedProjectType, setSelectedProjectType] = useState<string>("All");
  const [selectedTechStacks, setSelectedTechStacks] = useState<string[]>([]);
  const [techSearchQuery, setTechSearchQuery] = useState<string>("");
  const [hasFetchedProjects, setHasFetchedProjects] = useState(Boolean(worksProjectsCache));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  function applyTechFilter(skill: string) {
    const normalizedSkill = skill.trim();
    if (!normalizedSkill) {
      return;
    }

    setSelectedCategory("All");
    setSelectedTechStacks([normalizedSkill]);

    const filterSection =
      document.getElementById("works-tech-stack-filter") ||
      document.getElementById("works-tech-stack-filter-mobile");
    if (filterSection) {
      filterSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applyCategoryFilter(category: string) {
    const normalizedCategory = category.trim();
    if (!normalizedCategory) {
      return;
    }

    setSelectedCategory(normalizedCategory);
    setSelectedTechStacks([]);
  }

  useEffect(() => {
    const pendingSkill = window.localStorage.getItem(WORKS_TECH_FILTER_STORAGE_KEY) || "";
    if (pendingSkill.trim()) {
      applyTechFilter(pendingSkill);
      window.localStorage.removeItem(WORKS_TECH_FILTER_STORAGE_KEY);
    }

    const handleApplyTechFilter = (event: Event) => {
      const customEvent = event as CustomEvent<{ skill?: string }>;
      const skill = customEvent.detail?.skill || "";
      if (!skill.trim()) {
        return;
      }

      applyTechFilter(skill);
    };

    window.addEventListener(WORKS_TECH_FILTER_EVENT, handleApplyTechFilter as EventListener);

    return () => {
      window.removeEventListener(WORKS_TECH_FILTER_EVENT, handleApplyTechFilter as EventListener);
    };
  }, []);

  useEffect(() => {
    const pendingCategory = window.localStorage.getItem(WORKS_CATEGORY_STORAGE_KEY) || "";
    if (pendingCategory.trim()) {
      applyCategoryFilter(pendingCategory);
      window.localStorage.removeItem(WORKS_CATEGORY_STORAGE_KEY);
    }

    const handleApplyCategoryFilter = (event: Event) => {
      const customEvent = event as CustomEvent<{ category?: string }>;
      const category = customEvent.detail?.category || "";
      if (!category.trim()) {
        return;
      }

      applyCategoryFilter(category);
    };

    window.addEventListener(WORKS_CATEGORY_EVENT, handleApplyCategoryFilter as EventListener);

    return () => {
      window.removeEventListener(WORKS_CATEGORY_EVENT, handleApplyCategoryFilter as EventListener);
    };
  }, []);

  useEffect(() => {
    let isUnmounted = false;

    async function fetchProjects() {
      try {
        const cachedProjects = worksProjectsCache;
        if (cachedProjects) {
          setProjects(cachedProjects);
          setHasFetchedProjects(true);
          return;
        }

        const mappedProjects = await prefetchWorksPageData();
        if (!isUnmounted) {
          setProjects(mappedProjects);
        }
      } finally {
        if (!isUnmounted) {
          setHasFetchedProjects(true);
        }
      }
    }

    void fetchProjects();

    return () => {
      isUnmounted = true;
    };
  }, []);

  const categories = useMemo(() => {
    const categorySet = new Set(defaultCategories);

    projects.forEach((project) => {
      if (project.category) {
        project.category
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => categorySet.add(item));
      }
    });

    return Array.from(categorySet);
  }, [projects]);

  const techStackOptions = useMemo(() => {
    const skillSet = new Set<string>();

    projects.forEach((project) => {
      project.techStack.forEach((skill) => {
        const normalized = skill.trim();
        if (normalized) {
          skillSet.add(normalized);
        }
      });
    });

    return Array.from(skillSet).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  function toggleTechStack(skill: string) {
    setSelectedTechStacks((previous) => {
      if (previous.includes(skill)) {
        return previous.filter((item) => item !== skill);
      }

      return [...previous, skill];
    });
  }

  const filteredProjects = useMemo(() => {
    const categoryFiltered = selectedCategory === "All"
      ? projects
      : projects.filter((project) =>
          project.category
            ?.split(",")
            .map((item) => item.trim())
            .includes(selectedCategory)
        );

    const projectTypeFiltered = selectedProjectType === "All"
      ? categoryFiltered
      : categoryFiltered.filter(
          (project) =>
            normalizeProjectType(project.projectType) ===
            normalizeProjectType(toProjectTypeValue(selectedProjectType))
        );

    if (selectedTechStacks.length === 0) {
      return projectTypeFiltered;
    }

    const selectedSet = new Set(selectedTechStacks.map((item) => item.toLowerCase()));

    return projectTypeFiltered.filter((project) =>
      project.techStack.some((skill) => selectedSet.has(skill.toLowerCase()))
    );
  }, [projects, selectedCategory, selectedProjectType, selectedTechStacks]);

  function renderTechStackFilter(filterId: string, containerClassName = "") {
    const filteredTechOptions = techStackOptions.filter((skill) =>
      skill.toLowerCase().includes(techSearchQuery.toLowerCase())
    );

    return (
      <div id={filterId} className={`flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 shadow-xl shadow-neutral-100/40 ${containerClassName}`}>
        <div className="flex items-center justify-between pb-2 border-b border-neutral-50">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Tech Stack</h3>
          {selectedTechStacks.length > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-md bg-primary/10 px-2 text-[10px] font-bold text-primary">
              {selectedTechStacks.length} Active
            </span>
          )}
        </div>

        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Search tech..."
            value={techSearchQuery}
            onChange={(e) => setTechSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200/70 bg-neutral-50/50 px-3 py-2 text-xs font-medium text-neutral-800 placeholder-neutral-400 outline-none transition-all duration-200 hover:border-neutral-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
          />
          {techSearchQuery && (
            <button
              type="button"
              onClick={() => setTechSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mt-3.5 max-h-[260px] overflow-y-auto space-y-1 pr-1 hide-scrollbar">
          {filteredTechOptions.length === 0 ? (
            <p className="py-6 text-center text-xs font-medium text-neutral-400">
              No matching tags found.
            </p>
          ) : (
            filteredTechOptions.map((skill) => {
              const isChecked = selectedTechStacks.includes(skill);

              return (
                <label
                  key={`${filterId}-${skill}`}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-200 ${
                    isChecked
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTechStack(skill)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary accent-primary transition-all focus:ring-0 focus:ring-offset-0"
                    />
                    <span>{skill}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-50 pt-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTechStacks([]);
              setTechSearchQuery("");
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={selectedTechStacks.length === 0}
          >
            Reset Section
          </button>
          
          {selectedCategory !== "All" || selectedTechStacks.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("All");
                setSelectedProjectType("All");
                setSelectedTechStacks([]);
                setTechSearchQuery("");
              }}
              className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider hover:text-neutral-800 transition-colors"
            >
              Clear All
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section ref={pageRef} className="w-full bg-transparent px-6 pt-2 pb-12 lg:px-12 xl:px-20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-8 lg:flex-row lg:gap-12">
        
        {/* Left Category Selection Column Sidebar */}
        <aside className="hidden w-full max-w-[240px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] overflow-y-auto hide-scrollbar">
          <div className="mb-5 bg-neutral-50/60 backdrop-blur-sm rounded-xl p-1.5 border border-neutral-200/50 flex items-center gap-1">
            {projectTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedProjectType(type)}
                className={`flex-1 inline-flex h-7 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ${
                  selectedProjectType === type
                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                    : "text-neutral-500 hover:text-neutral-900 active:scale-95"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 w-full rounded-xl border px-4 text-left text-sm font-semibold transition-all duration-200 ${
                    selectedCategory === category
                      ? "border-primary bg-primary text-white font-bold shadow-md shadow-primary/10 active:translate-y-[1px]"
                      : "border-neutral-200/70 bg-transparent text-neutral-600 hover:border-primary/50 hover:text-primary active:scale-[0.98]"
                  }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Section / Grid */}
        <div className="w-full min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-start lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary bg-white px-4 text-xs font-bold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="text-base leading-none">☰</span>
              Filters
            </button>
          </div>

          {hasFetchedProjects && filteredProjects.length === 0 ? (
            <div className="flex min-h-[325px] items-center justify-center text-xl font-semibold text-neutral-400">
              No projects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
              {filteredProjects.map((project) => (
                <div key={project.id}>
                  <ProjectCard
                    project={project}
                    onOpenProjectDetails={onOpenProjectDetails}
                    onClickSkillTag={(skill) => {
                      queueWorksTechFilter(skill);
                      applyTechFilter(skill);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tech Stack Right Sidebar */}
        <aside className="hidden w-full max-w-[220px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto hide-scrollbar">
          {renderTechStackFilter("works-tech-stack-filter", "h-full")}
        </aside>
      </div>

      {/* Mobile Drawer Filter Layer */}
      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-[80] bg-neutral-950/40 backdrop-blur-xs lg:hidden animate-fade-in">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(false)}
            className="h-full w-full cursor-default"
            aria-label="Close filters backdrop"
          />
          <div className="absolute left-0 top-0 h-full w-full max-w-[300px] overflow-y-auto bg-white p-5 shadow-2xl border-r border-neutral-100 animate-slide-in">
            <div className="mb-5 flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Filters</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="inline-flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-500 active:scale-95"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Project Type</p>
              <div className="flex flex-wrap gap-1.5 bg-neutral-50 p-1 rounded-xl border border-neutral-200/60">
                {projectTypeOptions.map((type) => (
                  <button
                    key={`mobile-${type}`}
                    type="button"
                    onClick={() => {
                      setSelectedProjectType(type);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`flex-1 inline-flex h-7 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                      selectedProjectType === type
                        ? "bg-primary text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Category</p>
              <ul className="space-y-1.5">
                {categories.map((category) => (
                  <li key={`mobile-${category}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`h-9 w-full rounded-xl border px-4 text-left text-xs font-semibold transition-all ${
                        selectedCategory === category
                          ? "border-primary bg-primary text-white font-bold shadow-sm"
                          : "border-neutral-200/60 bg-transparent text-neutral-600"
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {renderTechStackFilter("works-tech-stack-filter-mobile", "rounded-2xl bg-neutral-50/50 border border-neutral-100 shadow-none")}
          </div>
        </div>
      ) : null}
    </section>
  );
}