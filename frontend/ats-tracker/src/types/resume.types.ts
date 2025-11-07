export interface ResumeTemplate {
  id: string;
  templateName: string;
  templateType?: 'chronological' | 'functional' | 'hybrid' | null;
  description?: string;
  colors?: string | object;
  fonts?: string | object;
  sectionOrder?: string[] | null;
  isDefault?: boolean;
  isShared?: boolean;
  layoutConfig?: LayoutConfig | null;
  existingResumeTemplate?: string | null;
}

export interface LayoutConfig {
  colors?: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
    accent?: string;
  };
  fonts?: {
    heading: string;
    body: string;
    size?: {
      heading: string;
      body: string;
    };
  };
  spacing?: {
    section: number;
    item: number;
  };
  alignment?: string;
  headerStyle?: string;
  sectionFormatting?: {
    [sectionId: string]: {
      fontSize?: string;
      fontWeight?: string;
      color?: string;
      backgroundColor?: string;
      textAlign?: string;
      marginTop?: string;
      marginBottom?: string;
    };
  };
}

export interface Resume {
  id: string;
  userId: string;
  templateId?: string;
  name: string;
  description?: string;
  jobId?: string;
  content: ResumeContent;
  sectionConfig: SectionConfig;
  customizations: LayoutConfig;
  versionNumber: number;
  parentResumeId?: string;
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeContent {
  personalInfo: PersonalInfo;
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  [key: string]: any; // For custom sections
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string[];
  achievements?: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate: string;
  gpa?: number;
  honors?: string;
}

export interface SkillEntry {
  id: string;
  name: string;
  category: string;
  proficiency?: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  organization: string;
  dateEarned: string;
  expirationDate?: string;
}

export interface SectionConfig {
  [sectionId: string]: {
    enabled: boolean;
    order: number;
    conditional?: {
      jobType?: string[];
      industry?: string[];
    };
  };
}

export interface AIGeneration {
  id: string;
  resumeId: string;
  jobId: string;
  generationType: 'content' | 'skills' | 'experience';
  inputData: any;
  generatedContent: any;
  variations: any[];
  relevanceScores: any;
  createdAt: string;
}

export interface ResumeShare {
  id: string;
  resumeId: string;
  shareToken: string;
  accessLevel: 'view' | 'comment' | 'edit';
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ResumeFeedback {
  id: string;
  resumeId: string;
  shareId: string;
  reviewerEmail?: string;
  reviewerName?: string;
  comment: string;
  sectionReference?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  id: string;
  resumeId: string;
  issueType: 'spelling' | 'grammar' | 'format' | 'length' | 'missing_info';
  severity: 'error' | 'warning' | 'info';
  message: string;
  sectionReference?: string;
  suggestion?: string;
  isResolved: boolean;
  createdAt: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  versionNumber: number;
  name: string;
  description?: string;
  contentSnapshot: ResumeContent;
  createdAt: string;
}

export interface ResumeInput {
  name: string;
  description?: string;
  templateId?: string;
  jobId?: string;
  content?: Partial<ResumeContent>;
  sectionConfig?: Partial<SectionConfig>;
  customizations?: Partial<LayoutConfig>;
}

