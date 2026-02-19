"use client";
// Client-side layout wrapper with navbar and content container

import { createContext, useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { supabase } from "../lib/supabase";

interface RootLayoutClientProps {
  children: React.ReactNode;
}

interface FooterProfileData {
  name?: string;
  email?: string;
  viber_number?: string;
  facebook_url?: string;
  github_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
}

interface ProjectCategoryData {
  category?: string | null;
}

const projectCategoryOrder = [
  "UI/UX Design",
  "Website",
  "Mobile",
  "Software",
  "Personal Projects",
  "Client Projects",
];

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const PageContext = createContext<{
  currentPage: string;
  setCurrentPage: (page: string) => void;
} | null>(null);

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [profile, setProfile] = useState<FooterProfileData | null>(null);
  const [projectCategories, setProjectCategories] = useState<ProjectCategoryData[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    async function fetchFooterData() {
      const [{ data: profileData }, { data: projectsData }] = await Promise.all([
        supabase
          .from("profile")
          .select("name, email, viber_number, facebook_url, github_url, linkedin_url, instagram_url")
          .single(),
        supabase
          .from("projects")
          .select("category")
          .not("category", "is", null),
      ]);

      if (profileData) {
        setProfile(profileData as FooterProfileData);
      }

      if (projectsData) {
        setProjectCategories(projectsData as ProjectCategoryData[]);
      }
    }

    fetchFooterData();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const footerContactLinks = [
    { label: "Email", href: profile?.email ? `mailto:${profile.email}` : "" },
    {
      label: "Viber",
      href: profile?.viber_number ? `viber://chat?number=${encodeURIComponent(profile.viber_number)}` : "",
    },
    { label: "Facebook", href: profile?.facebook_url || "" },
    { label: "GitHub", href: profile?.github_url || "" },
    { label: "LinkedIn", href: profile?.linkedin_url || "" },
    { label: "Instagram", href: profile?.instagram_url || "" },
  ].filter((item) => Boolean(item.href));

  const footerWorksLinks = useMemo(() => {
    const categoriesFromProjects = new Set(
      projectCategories
        .map((project) => project.category?.trim())
        .filter((category): category is string => Boolean(category))
    );

    return projectCategoryOrder
      .filter((category) => categoriesFromProjects.has(category))
      .map((category) => ({
        label: category,
        href: `/?page=works&category=${encodeURIComponent(toSlug(category))}`,
      }));
  }, [projectCategories]);

  const footerAboutLinks = [
    { label: "Personal Profile" },
    { label: "Educational Experience" },
    { label: "Work Experience" },
    { label: "Resume and CV" },
    { label: "Technical Skills" },
    { label: "Tools and Platform" },
    { label: "Programming Skills" },
  ];

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      <div className="min-h-screen bg-fairy-gradient font-sans dark:bg-black">
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="flex justify-center w-full">
          <div style={{ width: 1440 }}>
            {children}
            <Footer
              contactLinks={footerContactLinks}
              worksLinks={footerWorksLinks}
              aboutLinks={footerAboutLinks}
              ownerName={profile?.name}
            />
          </div>
        </div>

        <button
          type="button"
          aria-label="Scroll to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-8 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-[0_8px_18px_rgba(128,94,255,0.35)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(128,94,255,0.42)] active:translate-y-0 active:scale-95 ${
            showScrollTop ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          ↑
        </button>
      </div>
    </PageContext.Provider>
  );
}