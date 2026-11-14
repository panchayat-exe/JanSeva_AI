import { z } from 'zod';
import { ComplaintCategory, ComplaintPriority } from '@prisma/client';

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
  description: z.string().min(20, 'Please describe your complaint in at least 20 characters').max(5000).trim(),
  category: z.nativeEnum(ComplaintCategory),
  address: z.string().max(500).optional(),
  locality: z.string().max(200).optional(),
  landmark: z.string().max(200).optional(),
  nearestRoad: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDraft: z.boolean().default(false),
});

export const updateComplaintSchema = createComplaintSchema.partial();

export const listComplaintsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(10),
  status: z.string().optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  officerId: z.string().uuid().optional(),       // filter to officer-assigned complaints
  departmentId: z.string().uuid().optional(),    // filter to department complaints
});

export const verifyResolutionSchema = z.object({
  isSatisfied: z.boolean(),
  comment: z.string().max(1000).optional(),
});

export const reopenComplaintSchema = z.object({
  reason: z.enum([
    'Problem still exists',
    'Work is incomplete',
    'Temporary solution provided',
    'Other (Please specify)',
  ]),
  additionalDetails: z.string().max(2000).optional(),
});

export const rateComplaintSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const addTimelineNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});

export const complaintIdParamSchema = z.object({
  id: z.string().uuid('Invalid complaint ID'),
});

export const assignComplaintSchema = z.object({
  officerId: z.string().uuid('Invalid officer ID'),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  estimatedResolutionAt: z.coerce.date().optional(),
  note: z.string().max(1000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().max(10000).optional(),
});

export type CreateComplaintDto = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintDto = z.infer<typeof updateComplaintSchema>;
export type ListComplaintsQuery = z.infer<typeof listComplaintsSchema>;
export type VerifyResolutionDto = z.infer<typeof verifyResolutionSchema>;
export type ReopenComplaintDto = z.infer<typeof reopenComplaintSchema>;
export type RateComplaintDto = z.infer<typeof rateComplaintSchema>;
export type AssignComplaintDto = z.infer<typeof assignComplaintSchema>;
export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;
