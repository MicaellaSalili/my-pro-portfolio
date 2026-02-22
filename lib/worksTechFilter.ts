export const WORKS_TECH_FILTER_STORAGE_KEY = "works_tech_filter_v1";
export const WORKS_TECH_FILTER_EVENT = "works:apply-tech-filter";

export function queueWorksTechFilter(skill: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSkill = skill.trim();
  if (!normalizedSkill) {
    return;
  }

  window.localStorage.setItem(WORKS_TECH_FILTER_STORAGE_KEY, normalizedSkill);
  window.dispatchEvent(
    new CustomEvent(WORKS_TECH_FILTER_EVENT, {
      detail: { skill: normalizedSkill },
    })
  );
}
