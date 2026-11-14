import { prisma } from '../../config/database';
import type {
  CreateComplaintDto,
  UpdateComplaintDto,
  ListComplaintsQuery,
} from './complaint.validator';
import type { ComplaintStatus } from '@prisma/client';

// ─── Query Builders ────────────────────────────────────────

function buildWhereClause(
  citizenId: string | undefined,
  query: Partial<ListComplaintsQuery>,
): object {
  const andClauses: any[] = [];

  if (citizenId) andClauses.push({ citizenId });
  if (query.status) andClauses.push({ status: query.status });
  if (query.category) andClauses.push({ category: query.category });
  if (query.priority) andClauses.push({ priority: query.priority });
  if (query.officerId) andClauses.push({ officerId: query.officerId });
  
  if (query.departmentId) {
    andClauses.push({
      OR: [
        { departmentId: query.departmentId },
        { departmentId: null }
      ]
    });
  }

  if (query.search) {
    andClauses.push({
      OR: [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { complaintNumber: { contains: query.search, mode: 'insensitive' } },
        { locality: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  if (query.dateFrom || query.dateTo) {
    andClauses.push({
      createdAt: {
        ...(query.dateFrom && { gte: query.dateFrom }),
        ...(query.dateTo && { lte: query.dateTo }),
      },
    });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

// Select fields for list view (lighter query)
const complaintListSelect = {
  id: true,
  complaintNumber: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  address: true,
  locality: true,
  city: true,
  state: true,        // needed by GeoVision and Complaints list
  pincode: true,
  latitude: true,     // needed by GeoVision map markers
  longitude: true,    // needed by GeoVision map markers
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  rating: true,
  citizenId: true,
  departmentId: true,
  citizen: { select: { id: true, firstName: true, lastName: true } },
  officer: { select: { id: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true, code: true } },
};

// Select fields for detail view (full data)
const complaintDetailSelect = {
  ...complaintListSelect,
  description: true,
  state: true,
  pincode: true,
  latitude: true,
  longitude: true,
  aiCategory: true,
  aiPriority: true,
  aiSummary: true,
  aiDepartmentSuggestion: true,
  aiAnalyzedAt: true,
  resolutionNote: true,
  verifiedAt: true,
  closedAt: true,
  estimatedResolutionAt: true,
  ratingComment: true,
  ratedAt: true,
  reopenCount: true,
  lastReopenReason: true,
  lastReopenedAt: true,
  media: true,
};

// ─── Repository Functions ──────────────────────────────────

export async function createComplaint(
  citizenId: string,
  data: CreateComplaintDto,
  complaintNumber: string,
) {
  return prisma.complaint.create({
    data: {
      complaintNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      address: data.address,
      locality: data.locality,
      landmark: data.landmark,
      nearestRoad: data.nearestRoad,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      latitude: data.latitude,
      longitude: data.longitude,
      isDraft: data.isDraft,
      status: data.isDraft ? 'DRAFT' : 'SUBMITTED',
      citizenId,
    },
    select: complaintDetailSelect,
  });
}

export async function findComplaintById(id: string) {
  return prisma.complaint.findUnique({
    where: { id },
    select: complaintDetailSelect,
  });
}

export async function findComplaintWithTimeline(id: string) {
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { createdAt: 'desc' } },
      media: true,
      citizen: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      officer: { select: { id: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function listComplaints(
  citizenId: string | undefined,
  query: ListComplaintsQuery,
  skip: number,
  take: number,
) {
  const where = buildWhereClause(citizenId, query);
  const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({ where, skip, take, orderBy, select: complaintListSelect }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total };
}

export async function updateComplaint(id: string, data: UpdateComplaintDto) {
  return prisma.complaint.update({
    where: { id },
    data: {
      ...data,
      // If taking a draft out of draft mode, set to SUBMITTED
      ...(data.isDraft === false && { status: 'SUBMITTED' }),
    },
    select: complaintDetailSelect,
  });
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  extras?: {
    resolvedAt?: Date;
    verifiedAt?: Date;
    closedAt?: Date;
    resolutionNote?: string;
    lastReopenReason?: string;
    lastReopenedAt?: Date;
    reopenCount?: number;
    rating?: number;
    ratingComment?: string;
    ratedAt?: Date;
    officerId?: string;
    departmentId?: string;
    estimatedResolutionAt?: Date;
    aiCategory?: string;
    aiPriority?: string;
    aiSummary?: string;
    aiDepartmentSuggestion?: string;
    aiAnalyzedAt?: Date;
  },
) {
  return prisma.complaint.update({
    where: { id },
    data: { status, ...extras },
    select: complaintDetailSelect,
  });
}

export async function deleteComplaint(id: string): Promise<void> {
  await prisma.complaint.delete({ where: { id } });
}

export async function addTimelineEvent(data: {
  complaintId: string;
  eventType: string;
  title: string;
  description?: string;
  previousStatus?: ComplaintStatus;
  newStatus?: ComplaintStatus;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  metadata?: object;
}) {
  return prisma.complaintTimeline.create({
    data: data as Parameters<typeof prisma.complaintTimeline.create>[0]['data'],
  });
}

export async function getTimeline(complaintId: string) {
  return prisma.complaintTimeline.findMany({
    where: { complaintId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
}

export async function addMedia(data: {
  complaintId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  role: 'COMPLAINT_EVIDENCE' | 'BEFORE_REPAIR' | 'AFTER_REPAIR' | 'OFFICER_REPORT';
  uploadedById?: string;
}) {
  return prisma.complaintMedia.create({ data });
}

export async function getComplaintMedia(complaintId: string) {
  return prisma.complaintMedia.findMany({ where: { complaintId } });
}

// ─── Stats ─────────────────────────────────────────────────

export async function getComplaintStats(citizenId: string) {
  const [total, resolved, inProgress, reopened] = await Promise.all([
    prisma.complaint.count({ where: { citizenId } }),
    prisma.complaint.count({ where: { citizenId, status: { in: ['RESOLVED', 'CLOSED', 'VERIFIED'] } } }),
    prisma.complaint.count({ where: { citizenId, status: { in: ['IN_PROGRESS', 'ASSIGNED'] } } }),
    prisma.complaint.count({ where: { citizenId, status: 'REOPENED' } }),
  ]);
  return { total, resolved, inProgress, reopened };
}

export async function getAdminStats(departmentId?: string) {
  const baseWhere = departmentId 
    ? { OR: [{ departmentId }, { departmentId: null }] } 
    : {};

  const [total, pending, inProgress, resolved, closed] = await Promise.all([
    prisma.complaint.count({ where: baseWhere }),
    prisma.complaint.count({ 
      where: { ...baseWhere, status: { in: ['SUBMITTED', 'WAITING_FOR_ASSIGNMENT', 'REOPENED'] } } 
    }),
    prisma.complaint.count({ 
      where: { ...baseWhere, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'ESCALATED'] } } 
    }),
    prisma.complaint.count({ 
      where: { ...baseWhere, status: { in: ['RESOLVED', 'VERIFIED', 'AWAITING_CITIZEN_VERIFICATION'] } } 
    }),
    prisma.complaint.count({ 
      where: { ...baseWhere, status: { in: ['CLOSED', 'REJECTED'] } } 
    }),
  ]);
  return { total, pending, inProgress, resolved, closed };
}
