// Application-wide constants — no magic strings/numbers in code
export const CONSTANTS = {
  // JWT
  TOKEN_COOKIE_NAME: 'janseva_refresh_token',
  COOKIE_MAX_AGE_7D: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  // Complaint
  COMPLAINT_ID_PREFIX_MAP: {
    WATER_SUPPLY: 'WTR',
    ELECTRICITY: 'ELEC',
    GARBAGE_SANITATION: 'SWM',
    ROADS_INFRASTRUCTURE: 'ROAD',
    DRAINAGE_SEWAGE: 'DRN',
    STREET_LIGHTS: 'ELEC',
    PARKS_RECREATION: 'PRK',
    BUILDING_PERMITS: 'BUILD',
    NOISE_POLLUTION: 'ENV',
    AIR_POLLUTION: 'ENV',
    PUBLIC_TRANSPORT: 'TRNS',
    LAW_AND_ORDER: 'LAW',
    HEALTH_SERVICES: 'HLTH',
    EDUCATION: 'EDU',
    OTHER: 'JANSEVA',
  } as const,

  // Redis key prefixes
  REDIS_KEYS: {
    EMAIL_VERIFY: 'email_verify:',
    PASSWORD_RESET: 'pwd_reset:',
    REFRESH_TOKEN: 'refresh_token:',
    RATE_LIMIT: 'rate_limit:',
    AI_CACHE: 'ai_cache:',
  },

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  // File upload
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf'],
  ALLOWED_VIDEO_TYPES: ['video/mp4'],

  // Complaint status display labels
  STATUS_LABELS: {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    WAITING_FOR_ASSIGNMENT: 'Waiting for Assignment',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    VERIFIED: 'Verified',
    CLOSED: 'Closed',
    REOPENED: 'Reopened',
    ESCALATED: 'Escalated',
    REJECTED: 'Rejected',
  } as const,

  // Progress percentages per status (matches frontend progress bars)
  STATUS_PROGRESS: {
    DRAFT: 0,
    SUBMITTED: 10,
    WAITING_FOR_ASSIGNMENT: 20,
    ASSIGNED: 35,
    IN_PROGRESS: 70,
    RESOLVED: 90,
    VERIFIED: 95,
    CLOSED: 100,
    REOPENED: 25,
    ESCALATED: 60,
    REJECTED: 0,
  } as const,

  // Roles
  ROLES: {
    CITIZEN: 'CITIZEN',
    OFFICER: 'OFFICER',
    DEPT_ADMIN: 'DEPT_ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  } as const,
} as const;
