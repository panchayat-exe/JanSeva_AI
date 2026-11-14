import * as complaintRepo from './complaint.repository';
import { generateComplaintId } from '../../utils/crypto';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CONSTANTS } from '../../config/constants';
import {
  NotFoundError,
  AuthorizationError,
  BadRequestError,
} from '../../utils/appError';
import { createAuditLog } from '../../middleware/auditLog';
import { notificationService } from '../notification/notification.service';
import * as aiService from '../ai/ai.service';
import { logger } from '../../logger/winston';
import type {
  CreateComplaintDto,
  UpdateComplaintDto,
  ListComplaintsQuery,
  VerifyResolutionDto,
  ReopenComplaintDto,
  RateComplaintDto,
  AssignComplaintDto,
  UpdateStatusDto,
} from './complaint.validator';
import type { AuthenticatedUser } from '../../types/express.d';
import type { ComplaintCategory } from '@prisma/client';

// ─── Create ────────────────────────────────────────────────

export async function createComplaint(
  user: AuthenticatedUser,
  dto: CreateComplaintDto,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const prefixMap = CONSTANTS.COMPLAINT_ID_PREFIX_MAP;
  const prefix = prefixMap[dto.category as keyof typeof prefixMap] ?? 'JANSEVA';
  const complaintNumber = generateComplaintId(prefix);

  const complaint = await complaintRepo.createComplaint(user.id, dto, complaintNumber);

  // Add initial timeline event
  await complaintRepo.addTimelineEvent({
    complaintId: complaint.id,
    eventType: 'COMPLAINT_CREATED',
    title: dto.isDraft ? 'Complaint saved as draft' : 'Complaint submitted',
    description: dto.isDraft
      ? 'Complaint has been saved as a draft'
      : 'Complaint submitted to the system and awaiting assignment',
    newStatus: dto.isDraft ? 'DRAFT' : 'SUBMITTED',
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
  });

  // Send notification if not a draft
  if (!dto.isDraft) {
    notificationService.createNotification({
      userId: user.id,
      complaintId: complaint.id,
      type: 'COMPLAINT_SUBMITTED',
      title: 'Complaint Submitted',
      message: `Your complaint "${dto.title}" (${complaintNumber}) has been submitted successfully.`,
    }).catch((e) => logger.error('Notification failed', e));
  }

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    resource: 'complaints',
    resourceId: complaint.id,
    description: `Complaint created: ${complaintNumber}`,
    ...meta,
  });

  // Call AI Engine asynchronously (fire and update)
  if (!dto.isDraft) {
    aiService.analyzeComplaint(`${dto.title}\n${dto.description}`, dto.latitude, dto.longitude)
      .then(async (aiResult) => {
        if (aiResult) {
          logger.info(`AI analysis complete for ${complaint.id}`, { aiResult });
          await complaintRepo.updateComplaintStatus(complaint.id, complaint.status, {
            aiCategory: aiResult.category,
            aiDepartmentSuggestion: aiResult.department,
            aiPriority: aiResult.priority,
            aiAnalyzedAt: new Date(),
          } as any); // Using 'as any' since some fields (confidence, isCritical, isDuplicate) are newly added and we might need raw Prisma access

          // Update additional new fields directly using Prisma if needed
          const { prisma } = await import('../../config/database');
          await prisma.complaint.update({
            where: { id: complaint.id },
            data: {
              aiDepartment: aiResult.department,
              aiConfidence: aiResult.confidence,
              aiIsCritical: aiResult.is_critical,
              isDuplicate: aiResult.is_duplicate,
            }
          });
        }
      })
      .catch((e) => logger.error('Failed to analyze complaint with AI', e));
  }

  return complaint;
}

// ─── Get One ───────────────────────────────────────────────

export async function getComplaintById(id: string, user: AuthenticatedUser) {
  const complaint = await complaintRepo.findComplaintWithTimeline(id);
  if (!complaint) throw new NotFoundError('Complaint');

  // Citizens can only view their own complaints
  if (user.role === 'CITIZEN' && complaint.citizenId !== user.id) {
    throw new AuthorizationError();
  }

  // Officers can view complaints in their department, or unassigned complaints
  if (user.role === 'OFFICER' && complaint.departmentId && complaint.departmentId !== user.departmentId) {
    throw new AuthorizationError();
  }

  // Add progress percentage for frontend
  const statusProgress = CONSTANTS.STATUS_PROGRESS;
  const progress =
    statusProgress[complaint.status as keyof typeof statusProgress] ?? 0;

  return { ...complaint, progress };
}

// ─── List ──────────────────────────────────────────────────

export async function listComplaints(query: ListComplaintsQuery, user: AuthenticatedUser) {
  const { page, limit, skip } = parsePagination(query);

  // Citizens see only their own; Officers see department's; Admins see all
  const citizenId =
    user.role === 'CITIZEN' ? user.id : undefined;

  if (user.role === 'OFFICER' || user.role === 'DEPT_ADMIN') {
    query.departmentId = user.departmentId || undefined;
  }

  const { items, total } = await complaintRepo.listComplaints(citizenId, query, skip, limit);

  // Enrich with progress percentage
  const enriched = items.map((c) => ({
    ...c,
    progress: CONSTANTS.STATUS_PROGRESS[c.status as keyof typeof CONSTANTS.STATUS_PROGRESS] ?? 0,
    statusLabel: CONSTANTS.STATUS_LABELS[c.status as keyof typeof CONSTANTS.STATUS_LABELS] ?? c.status,
  }));

  return {
    items: enriched,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─── Update ────────────────────────────────────────────────

export async function updateComplaint(
  id: string,
  dto: UpdateComplaintDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');

  // Only citizen who owns it can edit, and only if it's a DRAFT
  if (complaint.citizenId !== user.id) throw new AuthorizationError();
  if (complaint.status !== 'DRAFT') {
    throw new BadRequestError('Only draft complaints can be edited');
  }

  const updated = await complaintRepo.updateComplaint(id, dto);

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    resource: 'complaints',
    resourceId: id,
    description: `Complaint updated: ${id}`,
  });

  return updated;
}

// ─── Delete ────────────────────────────────────────────────

export async function deleteComplaint(id: string, user: AuthenticatedUser) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');
  if (complaint.citizenId !== user.id && user.role !== 'SUPER_ADMIN') {
    throw new AuthorizationError();
  }
  if (!['DRAFT', 'SUBMITTED'].includes(complaint.status) && user.role === 'CITIZEN') {
    throw new BadRequestError('You cannot delete a complaint that is already being processed');
  }

  await complaintRepo.deleteComplaint(id);

  await createAuditLog({
    userId: user.id,
    action: 'DELETE',
    resource: 'complaints',
    resourceId: id,
    description: `Complaint deleted: ${id}`,
  });
}

// ─── Verify Resolution ─────────────────────────────────────

export async function verifyResolution(
  id: string,
  dto: VerifyResolutionDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');
  if (complaint.citizenId !== user.id) throw new AuthorizationError();

  // Accept both RESOLVED and AWAITING_CITIZEN_VERIFICATION
  if (!['RESOLVED', 'AWAITING_CITIZEN_VERIFICATION'].includes(complaint.status)) {
    throw new BadRequestError('This complaint is not ready for citizen verification');
  }

  // Support both isSatisfied and satisfied (citizen portal may send either)
  const satisfied = dto.isSatisfied;

  if (satisfied) {
    // Mark as CLOSED
    const { prisma } = await import('../../config/database');
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'CLOSED',
        verifiedAt: new Date(),
        closedAt: new Date(),
        resolutionNote: dto.comment,
        citizenVerification: 'YES',
        citizenVerifiedAt: new Date(),
      },
    });

    await complaintRepo.addTimelineEvent({
      complaintId: id,
      eventType: 'VERIFICATION_SUBMITTED',
      title: 'Citizen confirmed resolution — Problem Solved',
      description: dto.comment ?? 'The citizen has confirmed the problem has been resolved.',
      previousStatus: complaint.status,
      newStatus: 'CLOSED',
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.role,
    });

    return updated;
  } else {
    // Mark as REOPENED
    const { prisma } = await import('../../config/database');
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'REOPENED',
        lastReopenReason: dto.comment ?? 'Not satisfied with resolution',
        lastReopenedAt: new Date(),
        reopenCount: { increment: 1 },
        citizenVerification: 'NO',
        citizenVerifiedAt: new Date(),
        citizenVerificationReason: dto.comment,
      },
    });

    await complaintRepo.addTimelineEvent({
      complaintId: id,
      eventType: 'REOPENED',
      title: 'Complaint reopened by citizen — Problem Not Solved',
      description: dto.comment ?? 'Citizen reported that the issue was not resolved',
      previousStatus: complaint.status,
      newStatus: 'REOPENED',
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.role,
    });

    return updated;
  }
}

// ─── Reopen ────────────────────────────────────────────────

export async function reopenComplaint(
  id: string,
  dto: ReopenComplaintDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');
  if (complaint.citizenId !== user.id) throw new AuthorizationError();

  const details = dto.additionalDetails
    ? `${dto.reason}: ${dto.additionalDetails}`
    : dto.reason;

  const updated = await complaintRepo.updateComplaintStatus(id, 'REOPENED', {
    lastReopenReason: details,
    lastReopenedAt: new Date(),
  });

  await complaintRepo.addTimelineEvent({
    complaintId: id,
    eventType: 'REOPENED',
    title: 'Complaint Reopened',
    description: details,
    previousStatus: complaint.status,
    newStatus: 'REOPENED',
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
  });

  return updated;
}

// ─── Rate ──────────────────────────────────────────────────

export async function rateComplaint(
  id: string,
  dto: RateComplaintDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');
  if (complaint.citizenId !== user.id) throw new AuthorizationError();
  if (!['CLOSED', 'VERIFIED'].includes(complaint.status)) {
    throw new BadRequestError('You can only rate closed complaints');
  }
  if (complaint.rating !== null) {
    throw new BadRequestError('You have already rated this complaint');
  }

  const updated = await complaintRepo.updateComplaintStatus(id, complaint.status, {
    rating: dto.rating,
    ratingComment: dto.comment,
    ratedAt: new Date(),
  });

  await complaintRepo.addTimelineEvent({
    complaintId: id,
    eventType: 'VERIFICATION_SUBMITTED',
    title: `⭐ Citizen rated resolution ${dto.rating}/5`,
    description: dto.comment,
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
  });

  return updated;
}

// ─── Assign (Officer/Admin) ────────────────────────────────

export async function assignComplaint(
  id: string,
  dto: AssignComplaintDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');

  const updated = await complaintRepo.updateComplaintStatus(id, 'ASSIGNED', {
    officerId: dto.officerId,
    ...(dto.departmentId && { departmentId: dto.departmentId }),
    ...(dto.estimatedResolutionAt && { estimatedResolutionAt: dto.estimatedResolutionAt }),
    ...(dto.priority ? { priority: dto.priority as never } : {}),
  });

  await complaintRepo.addTimelineEvent({
    complaintId: id,
    eventType: 'OFFICER_ASSIGNED',
    title: 'Officer Assigned',
    description: dto.note ?? 'Complaint assigned to an officer for resolution',
    previousStatus: complaint.status,
    newStatus: 'ASSIGNED',
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
  });

  // Notify citizen
  notificationService.createNotification({
    userId: complaint.citizenId,
    complaintId: id,
    type: 'COMPLAINT_ASSIGNED',
    title: 'Officer Assigned to Your Complaint',
    message: `An officer has been assigned to your complaint "${complaint.title}". They will reach out to you soon.`,
  }).catch((e) => logger.error('Notification failed', e));

  return updated;
}

// ─── Update Status (Officer/Admin) ────────────────────────

export async function updateComplaintStatus(
  id: string,
  dto: UpdateStatusDto,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');

  const validStatuses = ['IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED', 'ASSIGNED', 'WAITING_FOR_ASSIGNMENT', 'AWAITING_CITIZEN_VERIFICATION'];
  if (!validStatuses.includes(dto.status)) {
    throw new BadRequestError(`Invalid status. Valid values: ${validStatuses.join(', ')}`);
  }

  const extras: Record<string, unknown> = {};
  if (dto.status === 'RESOLVED') extras.resolvedAt = new Date();
  if (dto.status === 'IN_PROGRESS') extras.officerId = user.id;

  const updated = await complaintRepo.updateComplaintStatus(
    id,
    dto.status as ComplaintCategory as never,
    extras as never,
  );

  await complaintRepo.addTimelineEvent({
    complaintId: id,
    eventType: 'STATUS_CHANGED',
    title: `Status Updated: ${dto.status.replace(/_/g, ' ')}`,
    description: dto.note,
    previousStatus: complaint.status,
    newStatus: dto.status as never,
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
  });

  // Notify citizen
  notificationService.createNotification({
    userId: complaint.citizenId,
    complaintId: id,
    type: 'STATUS_UPDATED',
    title: `Complaint Status Updated`,
    message: `Your complaint "${complaint.title}" status has been updated to: ${dto.status.replace(/_/g, ' ')}.`,
  }).catch((e) => logger.error('Notification failed', e));

  return updated;
}

// ─── Timeline ──────────────────────────────────────────────

export async function getTimeline(id: string, user: AuthenticatedUser) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');

  if (user.role === 'CITIZEN' && complaint.citizenId !== user.id) {
    throw new AuthorizationError();
  }

  return complaintRepo.getTimeline(id);
}

// ─── Field Officer: Verify Work Completed ─────────────────

export async function fieldOfficerVerifyWork(
  id: string,
  user: AuthenticatedUser,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new NotFoundError('Complaint');

  if (!['OFFICER', 'DEPT_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new AuthorizationError();
  }

  // Must be in RESOLVED state (engineer marked work done)
  if (!['RESOLVED', 'IN_PROGRESS'].includes(complaint.status)) {
    throw new BadRequestError(
      'This complaint is not ready for field officer verification. Status must be RESOLVED or IN_PROGRESS.',
    );
  }

  const { prisma } = await import('../../config/database');
  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      status: 'AWAITING_CITIZEN_VERIFICATION',
      fieldOfficerVerifiedAt: new Date(),
    },
  });

  await complaintRepo.addTimelineEvent({
    complaintId: id,
    eventType: 'VERIFICATION_SUBMITTED',
    title: 'Field Officer verified work completion',
    description: `Field Officer ${user.firstName} ${user.lastName} has verified that the work has been completed. The complaint is now awaiting citizen verification.`,
    previousStatus: complaint.status,
    newStatus: 'AWAITING_CITIZEN_VERIFICATION',
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    actorRole: user.role,
  });

  // Notify citizen
  notificationService.createNotification({
    userId: complaint.citizenId,
    complaintId: id,
    type: 'VERIFICATION_REQUIRED',
    title: 'Please verify your complaint resolution',
    message: `The field officer has verified the work on your complaint "${complaint.title}". Please confirm if the problem has been resolved.`,
  }).catch((e) => logger.error('Notification failed', e));

  return updated;
}

// ─── Stats ─────────────────────────────────────────────────

export async function getMyStats(userId: string) {
  return complaintRepo.getComplaintStats(userId);
}
