"use client";
// Main page with client-side routing for all pages

import { useContext } from "react";
import { PageContext } from "../components/RootLayoutClient";
import HomePage from "../components/HomePage";
import WorksPage from "../components/WorksPage";
import AboutPage from "../components/AboutPage";
import ContactPage from "../components/ContactPage";
import ProjectDetailsPage from "../components/ProjectDetailsPage";

export default function Home() {
  const context = useContext(PageContext);
  
  if (!context) return null;
  
  const { currentPage, setCurrentPage, selectedProjectId, setSelectedProjectId } = context;

  // Render the appropriate page based on current page state
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            setCurrentPage={setCurrentPage}
            onOpenProjectDetails={(projectId) => {
              setSelectedProjectId(projectId);
              setCurrentPage("project-details");
            }}
          />
        );
      case "works":
        return (
          <WorksPage
            onOpenProjectDetails={(projectId) => {
              setSelectedProjectId(projectId);
              setCurrentPage("project-details");
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
              setSelectedProjectId(projectId);
              setCurrentPage("project-details");
            }}
          />
        );
    }
  };

  return renderPage();
}
