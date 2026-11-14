// ─── API Types ─────────────────────────────────────────────────────────────────
// Shared TypeScript types that mirror backend response shapes

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// ─── User ──────────────────────────────────────────────────────────────────────

export type Role = "CITIZEN" | "OFFICER" | "DEPT_ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  citizenId?: string | null;
  profileImage?: string | null;
  phone?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  departmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Complaint ─────────────────────────────────────────────────────────────────

export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED"
  | "REOPENED";

export type ComplaintCategory =
  | "WATER_SUPPLY"
  | "ELECTRICITY"
  | "GARBAGE_SANITATION"
  | "ROADS_INFRASTRUCTURE"
  | "DRAINAGE_SEWAGE"
  | "STREET_LIGHTS"
  | "PARKS_RECREATION"
  | "BUILDING_PERMITS"
  | "NOISE_POLLUTION"
  | "AIR_POLLUTION"
  | "PUBLIC_TRANSPORT"
  | "LAW_AND_ORDER"
  | "HEALTH_SERVICES"
  | "EDUCATION"
  | "OTHER";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ComplaintMedia {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  fileName: string;
  fileSize: number;
}

export interface TimelineEntry {
  id: string;
  status: ComplaintStatus;
  description: string;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: Priority;
  address: string;
  city: string;
  state: string;
  pincode?: string | null;
  progress: number;
  aiSummary?: string | null;
  aiCategory?: string | null;
  estimatedResolution?: string | null;
  createdAt: string;
  updatedAt: string;
  citizen?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  media: ComplaintMedia[];
  timeline: TimelineEntry[];
}

export interface ComplaintListItem {
  id: string;
  complaintNumber: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: Priority;
  address: string;
  city: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  department?: { name: string } | null;
}

export interface CreateComplaintPayload {
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  priority?: Priority;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface CitizenDashboard {
  totalComplaints: number;
  statusCounts: Record<ComplaintStatus, number>;
  recentComplaints: ComplaintListItem[];
}
