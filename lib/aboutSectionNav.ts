export const ABOUT_SECTION_STORAGE_KEY = "about_section_target_v1";
export const ABOUT_SECTION_EVENT = "about:navigate-section";

export function queueAboutSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSectionId = sectionId.trim();
  if (!normalizedSectionId) {
    return;
  }

  window.localStorage.setItem(ABOUT_SECTION_STORAGE_KEY, normalizedSectionId);
  window.dispatchEvent(
    new CustomEvent(ABOUT_SECTION_EVENT, {
      detail: { sectionId: normalizedSectionId },
    })
  );
}
