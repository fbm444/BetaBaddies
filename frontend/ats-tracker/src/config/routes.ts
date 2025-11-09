// Centralized route constants
export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  BASIC_INFO: '/basic-information',
  EMPLOYMENT: '/employment',
  SKILLS: '/skills',
  EDUCATION: '/education',
  PROJECTS: '/projects',
  CERTIFICATIONS: '/certifications',
  SETTINGS: '/settings',
  RESUMES: '/resumes',
  RESUME_BUILDER: '/resumes/builder',
  RESUME_TEMPLATES: '/resumes/templates',
  RESUME_PREVIEW: '/resumes/preview',
  RESUME_AI_TAILORING: '/resumes/ai-tailoring',
} as const

// Navigation menu configuration
export const navigationItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: 'mingcute:home-line', 
    path: ROUTES.DASHBOARD 
  },
  { 
    id: 'profile', 
    label: 'Basic Info', 
    icon: 'mingcute:user-line', 
    path: ROUTES.BASIC_INFO 
  },
  { 
    id: 'employment', 
    label: 'Employment', 
    icon: 'mingcute:briefcase-line', 
    path: ROUTES.EMPLOYMENT 
  },
  { 
    id: 'skills', 
    label: 'Skills', 
    icon: 'mingcute:star-line', 
    path: ROUTES.SKILLS 
  },
  { 
    id: 'education', 
    label: 'Education', 
    icon: 'mingcute:school-line', 
    path: ROUTES.EDUCATION 
  },
  { 
    id: 'projects', 
    label: 'Projects', 
    icon: 'mingcute:folder-line', 
    path: ROUTES.PROJECTS 
  },
  { 
    id: 'certifications', 
    label: 'Certifications', 
    icon: 'mingcute:award-line', 
    path: ROUTES.CERTIFICATIONS 
  },
  { 
    id: 'resumes', 
    label: 'Resumes', 
    icon: 'mingcute:file-line', 
    path: ROUTES.RESUMES 
  },
] as const

// Type exports for TypeScript
export type RouteKey = keyof typeof ROUTES
export type RoutePath = typeof ROUTES[RouteKey]

