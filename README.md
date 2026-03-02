# Web Portfolio

A modern, full-stack developer portfolio built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. This project showcases your works, skills, milestones, and more, with a clean UI and dynamic content management.

## Features
- **Next.js 16** with App Router and TypeScript
- **Supabase** for backend data (projects, profile, milestones, etc.)
- **Tailwind CSS** for rapid, responsive styling
- **Dynamic sections**: Home, Works, About, Contact, Project Details
- **Client-side navigation** with smooth transitions
- **Responsive and accessible** design
- **SEO-ready** and optimized for performance
- **Easy deployment** to Vercel

## Folder Structure
```
my-pro-portfolio/
├── app/                # Next.js app directory (pages, layout, global styles)
│   ├── globals.css     # Global styles (Tailwind, custom CSS)
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page with routing
├── components/         # All React components (HomePage, AboutPage, Navbar, etc.)
├── lib/                # Utility libraries (Supabase client, navigation helpers)
├── public/             # Static assets (images, icons)
├── README.md           # Project documentation
├── <step-by-step-guide>.md # Step-by-step setup guide (see below)
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── next.config.ts      # Next.js configuration
└── ...
```

## Getting Started
1. **Clone the repo:**
   ```bash
   git clone https://github.com/yourusername/my-pro-portfolio.git
   cd my-pro-portfolio
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env.local` file with your Supabase project URL and anon key:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view your portfolio.

5. **Deploy:**
   - Push your code to GitHub.
   - Connect your repo to [Vercel](https://vercel.com/) and set the same environment variables.

## Customization
- Update your profile, projects, milestones, etc. in Supabase.
- Edit components in `/components` to change layout or add features.
- Update styles in `app/globals.css` or extend Tailwind config.

## Scripts
- `npm run dev` — Start local dev server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Lint code with ESLint

## License
MIT

---