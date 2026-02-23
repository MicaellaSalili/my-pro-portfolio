"use client";

import { useEffect, useMemo, useState } from "react";
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
  "Software",
  "System",
  "Data",
  "AI/ML",
  "Cybersecurity",
];

const projectTypeOptions = ["All", "Personal", "Client", "School"];

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
      className="relative w-full max-w-[461px] cursor-pointer rounded-[34px] border border-[rgba(163,134,255,0.28)] bg-white p-5 pb-20 shadow-[8px_8px_0px_0px_var(--color-primary)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] sm:p-6 sm:pb-24 md:p-8"
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
            className="inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-primary/15 px-2 text-[14px] font-semibold leading-none text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/25 active:translate-y-0 active:scale-95"
            aria-label={showAllTech ? "Show fewer tech skills" : `Show ${hiddenTechCount} more tech skills`}
          >
            {showAllTech ? "−" : `+${hiddenTechCount}`}
          </button>
        ) : null}
      </div>

      <div className="mb-8 h-[180px] w-full overflow-hidden rounded-[18px] bg-white sm:h-[194px]">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="h-full w-full object-contain object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ProjectImageIcon />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-left text-[30px] font-extrabold leading-[1.06] text-black sm:text-[36px] md:text-[42px]">{project.title}</h3>
        <p className="mt-3 line-clamp-3 text-left text-[14px] font-medium leading-relaxed text-secondary sm:text-[16px]">
          {project.description}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Open project details for ${project.title}`}
        onClick={() => {
          onOpenProjectDetails(project.id);
        }}
        className="absolute bottom-6 right-6 inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-primary text-[20px] font-semibold leading-none text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-95 sm:bottom-8 sm:right-8 sm:h-[48px] sm:w-[48px] sm:rounded-[16px] sm:text-[24px]"
      >
        ↗
      </button>
    </article>
  );
}

export default function WorksPage({
  onOpenProjectDetails,
}: {
  onOpenProjectDetails: (projectId: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedProjectType, setSelectedProjectType] = useState<string>("All");
  const [selectedTechStacks, setSelectedTechStacks] = useState<string[]>([]);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
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
    function parseTechStack(value: string | null) {
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

    async function fetchProjects() {
      try {
        const { data } = await supabase
          .from("projects")
          .select("id, title, description, thumbnail_url, project_type, category, live_demo_url, github_repo_url, project_skills(skill_id, tech_stack(skill_name))")
          .order("created_at", { ascending: false });

        const mappedProjects = (data as ProjectRow[] | null)?.map((project) => {
          const relatedSkills = (project.project_skills || [])
            .map((item) => item.tech_stack?.skill_name?.trim() || "")
            .filter(Boolean);

          const tags = relatedSkills.length > 0 ? relatedSkills : parseTechStack(project.category);

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

        setProjects(mappedProjects);
      } finally {
        setHasFetchedProjects(true);
      }
    }

    fetchProjects();
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
    return (
      <div id={filterId} className={`rounded-[16px] p-4 ${containerClassName}`}>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">Tech Stack</h3>
        <div className="mt-3 space-y-2">
          {techStackOptions.length === 0 ? (
            <p className="text-[12px] text-secondary">No tech tags yet.</p>
          ) : (
            techStackOptions.map((skill) => {
              const isChecked = selectedTechStacks.includes(skill);

              return (
                <label key={`${filterId}-${skill}`} className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-secondary transition-colors duration-200 hover:text-primary">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTechStack(skill)}
                    className="h-3.5 w-3.5 rounded-[3px] border border-primary text-primary accent-primary"
                  />
                  <span>{skill}</span>
                </label>
              );
            })
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("All");
            setSelectedTechStacks([]);
          }}
          className="mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary transition-all duration-200 hover:translate-x-0.5 hover:text-primary/80 active:translate-x-0 active:scale-95 disabled:opacity-40"
          disabled={selectedCategory === "All" && selectedTechStacks.length === 0}
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <section className="w-full bg-transparent px-5 py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 lg:flex-row lg:gap-8">
        <aside className="hidden w-full max-w-[270px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
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
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category} className="h-[50px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-full w-full rounded-[999px] border px-4 text-left text-[20px] leading-none transition-all ${
                    selectedCategory === category
                      ? "border-primary bg-primary text-white font-bold shadow-[0_6px_18px_rgba(128,94,255,0.35)]"
                      : "border-[#DCE0E8] bg-transparent font-semibold text-secondary hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:translate-y-0 active:scale-[0.99]"
                  }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </aside>

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
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpenProjectDetails={onOpenProjectDetails}
                  onClickSkillTag={(skill) => {
                    queueWorksTechFilter(skill);
                    applyTechFilter(skill);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden w-full max-w-[220px] shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {renderTechStackFilter("works-tech-stack-filter", "h-full")}
        </aside>
      </div>

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