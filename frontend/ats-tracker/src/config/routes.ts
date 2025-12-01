// Centralized route constants
export const ROUTES = {
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  BASIC_INFO: "/basic-information",
  EMPLOYMENT: "/employment",
  JOB_OPPORTUNITIES: "/job-opportunities",
  JOB_STATISTICS: "/job-opportunities/statistics",
  COMPANY_RESEARCH: "/company-research",
  INTERVIEWS: "/interviews",
  INTERVIEW_SCHEDULING: "/interview-scheduling",
  INTERVIEW_ANALYTICS: "/interview-analytics",
  SKILLS: "/skills",
  EDUCATION: "/education",
  PROJECTS: "/projects",
  CERTIFICATIONS: "/certifications",
  SETTINGS: "/settings",
  RESUMES: "/resumes",
  RESUME_BUILDER: "/resumes/builder",
  RESUME_TEMPLATES: "/resumes/templates",
  RESUME_PREVIEW: "/resumes/preview",
  RESUME_AI_TAILORING: "/resumes/ai-tailoring",
  COVER_LETTERS: "/coverletter",
  COVER_LETTER_BUILDER: "/coverletter/builder",
  COVER_LETTER_TEMPLATES: "/coverletter/templates",
  SALARY_NEGOTIATION: "/salary-negotiation",
  WRITING_PRACTICE: "/writing-practice",
} as const;

// Navigation item type
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// Navigation group type
export interface NavigationGroup {
  id: string;
  label: string;
  icon: string;
  items: NavigationItem[];
}

// Navigation menu configuration - grouped
export const navigationGroups: NavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "mingcute:home-line",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "mingcute:home-line",
        path: ROUTES.DASHBOARD,
      },
      {
        id: "profile",
        label: "Basic Info",
        icon: "mingcute:user-line",
        path: ROUTES.BASIC_INFO,
      },
    ],
  },
  {
    id: "career",
    label: "Career",
    icon: "mingcute:briefcase-line",
    items: [
      {
        id: "employment",
        label: "Employment",
        icon: "mingcute:briefcase-line",
        path: ROUTES.EMPLOYMENT,
      },
      {
        id: "job-opportunities",
        label: "Job Opportunities",
        icon: "mingcute:search-line",
        path: ROUTES.JOB_OPPORTUNITIES,
      },
      {
        id: "company-research",
        label: "Company Research",
        icon: "mdi:office-building",
        path: ROUTES.COMPANY_RESEARCH,
      },
      {
        id: "interviews",
        label: "Interviews",
        icon: "mingcute:calendar-line",
        path: ROUTES.INTERVIEWS,
      },
      {
        id: "salary-negotiation",
        label: "Salary Negotiation",
        icon: "mdi:currency-usd",
        path: ROUTES.SALARY_NEGOTIATION,
      },
      {
        id: "writing-practice",
        label: "Writing Practice",
        icon: "mingcute:edit-line",
        path: ROUTES.WRITING_PRACTICE,
      },
    ],
  },
  {
    id: "skills-experience",
    label: "Skills & Experience",
    icon: "mingcute:star-line",
    items: [
      {
        id: "skills",
        label: "Skills",
        icon: "mingcute:star-line",
        path: ROUTES.SKILLS,
      },
      {
        id: "education",
        label: "Education",
        icon: "mingcute:school-line",
        path: ROUTES.EDUCATION,
      },
      {
        id: "projects",
        label: "Projects",
        icon: "mingcute:folder-line",
        path: ROUTES.PROJECTS,
      },
      {
        id: "certifications",
        label: "Certifications",
        icon: "mingcute:award-line",
        path: ROUTES.CERTIFICATIONS,
      },
    ],
  },
  {
    id: "resumes",
    label: "Resumes",
    icon: "mingcute:file-line",
    items: [
      {
        id: "resumes",
        label: "Resumes",
        icon: "mingcute:file-line",
        path: ROUTES.RESUMES,
      },
    ],
  },
  {
    id: "coverletters",
    label: "Cover Letters",
    icon: "mingcute:mail-line",
    items: [
      {
        id: "coverletters",
        label: "Cover Letters",
        icon: "mingcute:mail-line",
        path: ROUTES.COVER_LETTERS,
      },
    ],
  },

] as const;

// Flattened navigation items for backward compatibility
export const navigationItems: NavigationItem[] = navigationGroups.flatMap(
  (group) => group.items
);
// Type exports for TypeScript
export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
