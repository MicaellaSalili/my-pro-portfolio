-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profile (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  hero_title text,
  hero_sub_headline text,
  about_summary text,
  profile_image_url text,
  resume_download_url text,
  email text,
  viber_number text,
  github_url text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  location_general text,
  cv_download_url text,
  CONSTRAINT profile_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tech_stack (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category text,
  skill_name text UNIQUE,
  is_featured boolean,
  CONSTRAINT tech_stack_pkey PRIMARY KEY (id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  slug text UNIQUE,
  title text,
  description text,
  hook text,
  thumbnail_url text,
  overview text,
  my_role text,
  features jsonb,
  impact_reflection text,
  live_demo_url text,
  github_repo_url text,
  category USER-DEFINED,
  is_featured boolean,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  project_type USER-DEFINED,
  live_project_url text CHECK (live_project_url IS NULL OR live_project_url ~* '^https?://'::text),
  figma_documentation_url text,
  figma_image_url text,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.experience (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  role text,
  company text,
  location text,
  period text,
  description text,
  proof_url text,
  sort_order integer,
  CONSTRAINT experience_pkey PRIMARY KEY (id)
);
CREATE TABLE public.project_skills (
  project_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  CONSTRAINT project_skills_pkey PRIMARY KEY (project_id, skill_id),
  CONSTRAINT project_skills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.tech_stack(id)
);
CREATE TABLE public.experience_skills (
  experience_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  CONSTRAINT experience_skills_pkey PRIMARY KEY (experience_id, skill_id),
  CONSTRAINT experience_skills_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES public.experience(id),
  CONSTRAINT experience_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.tech_stack(id)
);
CREATE TABLE public.education (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  degree text,
  school text,
  period text,
  elective text,
  sort_order smallint,
  CONSTRAINT education_pkey PRIMARY KEY (id)
);
CREATE TABLE public.certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  issuer text,
  date_earned text,
  credential_url text,
  CONSTRAINT certifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  label text,
  value text,
  CONSTRAINT milestones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.specializations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  bullets ARRAY NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT specializations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(TRIM(BOTH FROM name)) >= 1 AND char_length(TRIM(BOTH FROM name)) <= 120),
  email text NOT NULL CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text),
  subject text NOT NULL CHECK (char_length(TRIM(BOTH FROM subject)) >= 1 AND char_length(TRIM(BOTH FROM subject)) <= 200),
  message text NOT NULL CHECK (char_length(TRIM(BOTH FROM message)) >= 1 AND char_length(TRIM(BOTH FROM message)) <= 5000),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);