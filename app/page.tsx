"use client";
// Main page with client-side routing for all pages

import { useContext } from "react";
import { PageContext } from "../components/RootLayoutClient";
import HomePage from "../components/HomePage";
import WorksPage from "../components/WorksPage";
import AboutPage from "../components/AboutPage";
import ContactPage from "../components/ContactPage";

export default function Home() {
  const context = useContext(PageContext);
  
  if (!context) return null;
  
  const { currentPage, setCurrentPage } = context;

  // Render the appropriate page based on current page state
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage setCurrentPage={setCurrentPage} />;
      case "works":
        return <WorksPage />;
      case "about":
        return <AboutPage />;
      case "contact":
        return <ContactPage />;
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };

  return renderPage();
}
