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
  ANALYTICS: "/analytics",
  MARKET_INTELLIGENCE: "/market-intelligence",
  REPORT_GENERATOR: "/reports",
  INTERVIEW_PREPARATION: "/interview-preparation",
  INTERVIEW_PREPARATION_WITH_ID: "/interview-preparation/:interviewId",
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
  // Collaboration
  TEAMS: "/collaboration/teams",
  TEAM_DETAIL: "/collaboration/teams/:teamId",
  MENTOR_DASHBOARD: "/collaboration/mentor",
  MENTEE_DASHBOARD: "/collaboration/mentee",
  MENTEE_PROGRESS: "/collaboration/mentor/mentees/:menteeId",
  DOCUMENT_REVIEWS: "/collaboration/reviews",
  PROGRESS_SHARING: "/collaboration/progress",
  SUPPORT_GROUPS: "/collaboration/groups",
  TEAM_INVITE_ACCEPT: "/collaboration/teams/accept-invite",
  SALARY_NEGOTIATION: "/salary-negotiation",
  WRITING_PRACTICE: "/writing-practice",
  NETWORK_CONTACTS: "/network/contacts",
  NETWORK_EVENTS: "/network/events",
  NETWORK_REFERRALS: "/network/referrals",
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
    ],
  },
  {
    id: "interviews",
    label: "Interviews",
    icon: "mingcute:calendar-line",
    items: [
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
      {
        id: "interview-preparation",
        label: "Interview Preparation",
        icon: "mingcute:book-line",
        path: ROUTES.INTERVIEW_PREPARATION,
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: "mingcute:chart-line",
        path: ROUTES.ANALYTICS,
      },
      {
        id: "market-intelligence",
        label: "Market Intelligence",
        icon: "mingcute:chart-up-line",
        path: ROUTES.MARKET_INTELLIGENCE,
      },
      {
        id: "report-generator",
        label: "Generate Reports",
        icon: "mingcute:file-download-line",
        path: ROUTES.REPORT_GENERATOR,
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
    id: "documents",
    label: "Documents",
    icon: "mingcute:file-line",
    items: [
      {
        id: "resumes",
        label: "Resumes",
        icon: "mingcute:file-line",
        path: ROUTES.RESUMES,
      },
      {
        id: "coverletters",
        label: "Cover Letters",
        icon: "mingcute:mail-line",
        path: ROUTES.COVER_LETTERS,
      },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: "mingcute:user-3-line",
    items: [
      {
        id: "contacts",
        label: "Contacts",
        icon: "mingcute:user-3-line",
        path: ROUTES.NETWORK_CONTACTS,
      },
      {
        id: "events",
        label: "Events",
        icon: "mingcute:calendar-line",
        path: ROUTES.NETWORK_EVENTS,
      },
      {
        id: "referrals",
        label: "Referrals",
        icon: "mingcute:pen-line",
        path: ROUTES.NETWORK_REFERRALS,
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: "mingcute:user-group-line",
    items: [
      {
        id: "teams",
        label: "Teams",
        icon: "mingcute:user-2-line",
        path: ROUTES.TEAMS,
      },
      {
        id: "mentor-dashboard",
        label: "Mentor Dashboard",
        icon: "mingcute:grid-line",
        path: ROUTES.MENTOR_DASHBOARD,
      },
      {
        id: "mentee-dashboard",
        label: "Mentee Dashboard",
        icon: "mingcute:layout-grid-line",
        path: ROUTES.MENTEE_DASHBOARD,
      },
      {
        id: "support-groups",
        label: "Support Groups",
        icon: "mingcute:group-3-line",
        path: ROUTES.SUPPORT_GROUPS,
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
