import { Router } from 'express';
import * as complaintController from './complaint.controller';
import { authenticate, authorize, requireEmailVerified } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { uploadSingle, uploadMultiple } from '../../middleware/upload';
import {
  createComplaintSchema,
  updateComplaintSchema,
  listComplaintsSchema,
  verifyResolutionSchema,
  reopenComplaintSchema,
  rateComplaintSchema,
  complaintIdParamSchema,
  assignComplaintSchema,
  updateStatusSchema,
} from './complaint.validator';

const router = Router();

// All complaint routes require authentication
router.use(authenticate, requireEmailVerified);

/**
 * @swagger
 * /complaints:
 *   get:
 *     tags: [Complaints]
 *     summary: List complaints (citizen sees own, officers see department, admins see all)
 */
router.get('/', validate(listComplaintsSchema, 'query'), complaintController.listComplaints);

/**
 * @swagger
 * /complaints:
 *   post:
 *     tags: [Complaints]
 *     summary: Create a new complaint
 */
router.post(
  '/',
  authorize('CITIZEN'),
  validate(createComplaintSchema),
  complaintController.createComplaint,
);

/**
 * @swagger
 * /complaints/{id}:
 *   get:
 *     tags: [Complaints]
 *     summary: Get complaint details
 */
router.get(
  '/:id',
  validate(complaintIdParamSchema, 'params'),
  complaintController.getComplaint,
);

/**
 * @swagger
 * /complaints/{id}:
 *   put:
 *     tags: [Complaints]
 *     summary: Update a draft complaint
 */
router.put(
  '/:id',
  authorize('CITIZEN'),
  validate(complaintIdParamSchema, 'params'),
  validate(updateComplaintSchema),
  complaintController.updateComplaint,
);

/**
 * @swagger
 * /complaints/{id}:
 *   delete:
 *     tags: [Complaints]
 *     summary: Delete a draft complaint
 */
router.delete(
  '/:id',
  validate(complaintIdParamSchema, 'params'),
  complaintController.deleteComplaint,
);

/**
 * @swagger
 * /complaints/{id}/timeline:
 *   get:
 *     tags: [Complaints]
 *     summary: Get full complaint timeline
 */
router.get(
  '/:id/timeline',
  validate(complaintIdParamSchema, 'params'),
  complaintController.getTimeline,
);

/**
 * @swagger
 * /complaints/{id}/location-intelligence:
 *   get:
 *     tags: [Complaints]
 *     summary: Real-time geospatial analysis for a complaint
 */
router.get(
  '/:id/location-intelligence',
  validate(complaintIdParamSchema, 'params'),
  complaintController.getLocationIntelligence,
);

/**
 * @swagger
 * /complaints/{id}/media:
 *   post:
 *     tags: [Complaints]
 *     summary: Upload file evidence to a complaint
 */
router.post(
  '/:id/media',
  validate(complaintIdParamSchema, 'params'),
  uploadSingle,
  complaintController.uploadMedia,
);

/**
 * @swagger
 * /complaints/{id}/verify:
 *   post:
 *     tags: [Complaints]
 *     summary: Citizen verifies resolution (Yes = close, No = reopen)
 */
router.post(
  '/:id/verify',
  authorize('CITIZEN'),
  validate(complaintIdParamSchema, 'params'),
  validate(verifyResolutionSchema),
  complaintController.verifyResolution,
);

/**
 * @swagger
 * /complaints/{id}/reopen:
 *   post:
 *     tags: [Complaints]
 *     summary: Reopen a complaint with reason
 */
router.post(
  '/:id/reopen',
  authorize('CITIZEN'),
  validate(complaintIdParamSchema, 'params'),
  validate(reopenComplaintSchema),
  complaintController.reopenComplaint,
);

/**
 * @swagger
 * /complaints/{id}/rate:
 *   post:
 *     tags: [Complaints]
 *     summary: Rate a resolved complaint (1-5 stars)
 */
router.post(
  '/:id/rate',
  authorize('CITIZEN'),
  validate(complaintIdParamSchema, 'params'),
  validate(rateComplaintSchema),
  complaintController.rateComplaint,
);

/**
 * @swagger
 * /complaints/{id}/assign:
 *   post:
 *     tags: [Complaints]
 *     summary: Assign complaint to officer (Admin only)
 */
router.post(
  '/:id/assign',
  authorize('DEPT_ADMIN', 'SUPER_ADMIN'),
  validate(complaintIdParamSchema, 'params'),
  validate(assignComplaintSchema),
  complaintController.assignComplaint,
);

/**
 * @swagger
 * /complaints/{id}/status:
 *   put:
 *     tags: [Complaints]
 *     summary: Update complaint status (Officer/Admin)
 */
router.put(
  '/:id/status',
  authorize('OFFICER', 'DEPT_ADMIN', 'SUPER_ADMIN'),
  validate(complaintIdParamSchema, 'params'),
  validate(updateStatusSchema),
  complaintController.updateComplaintStatus,
);

/**
 * @swagger
 * /complaints/{id}/field-officer-verify:
 *   post:
 *     tags: [Complaints]
 *     summary: Field Officer verifies work completion (moves to AWAITING_CITIZEN_VERIFICATION)
 */
router.post(
  '/:id/field-officer-verify',
  authorize('OFFICER', 'DEPT_ADMIN', 'SUPER_ADMIN'),
  validate(complaintIdParamSchema, 'params'),
  complaintController.fieldOfficerVerifyWork,
);

export default router;
