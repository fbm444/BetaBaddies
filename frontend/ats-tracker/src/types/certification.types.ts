// Certification types based on backend schema
export interface CertificationData {
  id: string;
  user_id: string;
  name: string;
  org_name: string;
  date_earned: string; // ISO date string
  expiration_date: string | null; // ISO date string
  never_expires: boolean;
  platform?: string | null; // Platform name (HackerRank, LeetCode, Codecademy, Coursera, etc.)
  badge_image?: string | null; // Path to badge image
  verification_url?: string | null; // URL to verify certification
  category?: string | null; // Category (coding, business, design, etc.)
  description?: string | null; // Rich text description (markdown)
  assessment_scores?: Record<string, any> | null; // Skill assessment scores
  achievements?: string[] | null; // List of achievements
  created_at?: string;
  updated_at?: string;
  // Computed fields (frontend only)
  status?: "active" | "expiring" | "expired" | "permanent";
  daysUntilExpiration?: number | null;
}

export interface CertificationInput {
  name: string;
  orgName: string; // camelCase for backend
  dateEarned: string; // camelCase for backend
  expirationDate: string | null; // camelCase for backend
  neverExpires: boolean; // camelCase for backend
  platform?: string | null;
  badgeImage?: string | null;
  verificationUrl?: string | null;
  category?: string | null;
  description?: string | null;
  assessmentScores?: Record<string, any> | null;
  achievements?: string[] | null;
}

export interface CertificationStatistics {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  permanent: number;
  byOrganization: Record<string, number>;
}

