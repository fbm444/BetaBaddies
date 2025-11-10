// Certification types based on backend schema
export interface CertificationData {
  id: string;
  user_id: string;
  name: string;
  org_name: string;
  date_earned: string; // ISO date string
  expiration_date: string | null; // ISO date string
  never_expires: boolean;
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
}

export interface CertificationStatistics {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  permanent: number;
  byOrganization: Record<string, number>;
}

