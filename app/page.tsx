"use client";
// Main page with client-side routing for all pages

import { useContext, useEffect } from "react";
import { PageContext } from "../components/RootLayoutClient";
import HomePage, { prefetchHomePageData } from "../components/HomePage";
import WorksPage, { prefetchWorksPageData } from "../components/WorksPage";
import AboutPage, { prefetchAboutPageData } from "../components/AboutPage";
import ContactPage, { prefetchContactPageData } from "../components/ContactPage";
import ProjectDetailsPage, { prefetchProjectDetails } from "../components/ProjectDetailsPage";

export default function Home() {
  const context = useContext(PageContext);
  
  if (!context) return null;
  
  const { currentPage, setCurrentPage, selectedProjectId, setSelectedProjectId } = context;

  useEffect(() => {
    void Promise.allSettled([
      prefetchHomePageData(),
      prefetchWorksPageData(),
      prefetchAboutPageData(),
      prefetchContactPageData(),
    ]);
  }, []);

  const openProjectDetails = async (projectId: string) => {
    setSelectedProjectId(projectId);

    try {
      await prefetchProjectDetails(projectId);
    } catch {
    }

    setCurrentPage("project-details");
  };

  // Render the appropriate page based on current page state
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            setCurrentPage={setCurrentPage}
            onOpenProjectDetails={(projectId) => {
              void openProjectDetails(projectId);
            }}
          />
        );
      case "works":
        return (
          <WorksPage
            onOpenProjectDetails={(projectId) => {
              void openProjectDetails(projectId);
            }}
          />
        );
      case "about":
        return <AboutPage />;
      case "contact":
        return <ContactPage />;
      case "project-details":
        return (
          <ProjectDetailsPage
            projectId={selectedProjectId}
            onBack={() => setCurrentPage("works")}
          />
        );
      default:
        return (
          <HomePage
            setCurrentPage={setCurrentPage}
            onOpenProjectDetails={(projectId) => {
              void openProjectDetails(projectId);
            }}
          />
        );
    }
  };

  return renderPage();
}
