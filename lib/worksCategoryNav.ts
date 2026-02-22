export const WORKS_CATEGORY_STORAGE_KEY = "works_category_target_v1";
export const WORKS_CATEGORY_EVENT = "works:apply-category";

export function queueWorksCategory(category: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedCategory = category.trim();
  if (!normalizedCategory) {
    return;
  }

  window.localStorage.setItem(WORKS_CATEGORY_STORAGE_KEY, normalizedCategory);
  window.dispatchEvent(
    new CustomEvent(WORKS_CATEGORY_EVENT, {
      detail: { category: normalizedCategory },
    })
  );
}
