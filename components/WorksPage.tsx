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
      <div id={filterId} className={`flex flex-col rounded-[24px] border border-[rgba(163,134,255,0.18)] bg-white p-5 shadow-[4px_4px_0px_0px_rgba(128,94,255,0.1)] ${containerClassName}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-black">Tech Stack</h3>
          {selectedTechStacks.length > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-bold text-primary">
              {selectedTechStacks.length} active
            </span>
          )}
        </div>

        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Search tech..."
            value={techSearchQuery}
            onChange={(e) => setTechSearchQuery(e.target.value)}
            className="w-full rounded-[12px] border border-[#DCE0E8] bg-[#F9FAFB] px-3 py-2 text-[13px] font-medium text-black placeholder-[#9AA4B2] transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {techSearchQuery && (
            <button
              type="button"
              onClick={() => setTechSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#9AA4B2] hover:text-black"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mt-4 max-h-[280px] overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20">
          {filteredTechOptions.length === 0 ? (
            <p className="py-4 text-center text-[12px] font-medium text-secondary">
              No matching tags found.
            </p>
          ) : (
            filteredTechOptions.map((skill) => {
              const isChecked = selectedTechStacks.includes(skill);

              return (
                <label
                  key={`${filterId}-${skill}`}
                  className={`flex cursor-pointer items-center justify-between rounded-[10px] px-2.5 py-2 transition-all duration-150 ${
                    isChecked
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-secondary hover:bg-[#F4F5F7] hover:text-black"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTechStack(skill)}
                      className="h-4 w-4 rounded-[4px] border-[#DCE0E8] text-primary accent-primary transition-all focus:ring-0 focus:ring-offset-0"
                    />
                    <span>{skill}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#F4F5F7] pt-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTechStacks([]);
              setTechSearchQuery("");
            }}
            className="text-[11px] font-bold uppercase tracking-[0.06em] text-primary transition-all hover:text-primary/80 disabled:opacity-30"
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
              className="text-[11px] font-semibold text-secondary hover:text-black"
            >
              Clear All Filters
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section ref={pageRef} className="w-full bg-transparent px-5 py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 lg:flex-row lg:gap-8">
        
        {/* Category Left Sticky Selection Column */}
        <aside className="hidden w-full max-w-[270px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-6">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {projectTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedProjectType(type)}
                  className={`inline-flex h-[30px] min-w-[60px] items-center justify-center rounded-[999px] border px-2 text-[9px] font-bold uppercase tracking-[0.04em] leading-none transition-all ${
                    selectedProjectType === type
                      ? "border-primary bg-primary text-white shadow-[0_6px_18px_rgba(128,94,255,0.35)]"
                      : "border-[#DCE0E8] bg-transparent text-[#9AA4B2] hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:translate-y-0 active:scale-[0.98]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-2.5">
            {categories.map((category) => (
              <li key={category} className="h-[46px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-full w-full rounded-[999px] border px-5 text-left text-[15px] leading-none transition-all ${
                    selectedCategory === category
                      ? "border-primary bg-primary text-white font-bold shadow-[0_4px_12px_rgba(128,94,255,0.25)]"
                      : "border-[#DCE0E8] bg-transparent font-semibold text-secondary hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:translate-y-0 active:scale-[0.99]"
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
              className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-primary bg-white px-4 text-[14px] font-semibold text-primary shadow-[0_6px_16px_rgba(128,94,255,0.2)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="text-[18px] leading-none">☰</span>
              Filters
            </button>
          </div>

          {hasFetchedProjects && filteredProjects.length === 0 ? (
            <div className="flex min-h-[325px] items-center justify-center text-[24px] font-medium text-secondary">
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
        <aside className="hidden w-full max-w-[220px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {renderTechStackFilter("works-tech-stack-filter", "h-full")}
        </aside>
      </div>

      {/* Mobile Drawer Filter Layer */}
      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/35 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(false)}
            className="h-full w-full"
            aria-label="Close filters backdrop"
          />
          <div className="absolute left-0 top-0 h-full w-full max-w-[340px] overflow-y-auto bg-white px-4 py-4 shadow-[10px_0_24px_rgba(15,24,51,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-black">Filters</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 text-[18px] text-primary"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">Project Type</p>
              <div className="flex flex-wrap gap-1.5">
                {projectTypeOptions.map((type) => (
                  <button
                    key={`mobile-${type}`}
                    type="button"
                    onClick={() => {
                      setSelectedProjectType(type);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`inline-flex h-[30px] min-w-[60px] items-center justify-center rounded-[999px] border px-2 text-[9px] font-bold uppercase tracking-[0.04em] leading-none transition-all ${
                      selectedProjectType === type
                        ? "border-primary bg-primary text-white shadow-[0_6px_18px_rgba(128,94,255,0.35)]"
                        : "border-[#DCE0E8] bg-transparent text-[#9AA4B2]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">Category</p>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={`mobile-${category}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`h-[42px] w-full rounded-[999px] border px-4 text-left text-[14px] leading-none transition-all ${
                        selectedCategory === category
                          ? "border-primary bg-primary text-white font-bold shadow-[0_6px_18px_rgba(128,94,255,0.35)]"
                          : "border-[#DCE0E8] bg-transparent font-semibold text-secondary"
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {renderTechStackFilter("works-tech-stack-filter-mobile", "rounded-[14px] bg-[#f7f7f8]")}
          </div>
        </div>
      ) : null}
    </section>
  );
}