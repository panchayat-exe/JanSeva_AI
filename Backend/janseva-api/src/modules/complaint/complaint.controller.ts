import type { Request, Response, NextFunction } from 'express';
import * as complaintService from './complaint.service';
import * as complaintRepo from './complaint.repository';
import * as locationIntelligenceService from './location-intelligence.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';


// Helper to safely get string param
const param = (req: Request, key: string): string => String(req.params[key]);

export async function createComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await complaintService.createComplaint(req.user!, req.body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    sendCreated(res, complaint, 'Complaint submitted successfully', req.requestId);
  } catch (err) { next(err); }
}

export async function getComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await complaintService.getComplaintById(param(req, 'id'), req.user!);
    sendSuccess(res, complaint, 'Complaint retrieved', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function listComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.listComplaints(req.query as never, req.user!);
    sendSuccess(res, result.items, 'Complaints retrieved', 200, result.meta, req.requestId);
  } catch (err) { next(err); }
}

export async function updateComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await complaintService.updateComplaint(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, complaint, 'Complaint updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function deleteComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await complaintService.deleteComplaint(param(req, 'id'), req.user!);
    sendNoContent(res);
  } catch (err) { next(err); }
}

export async function verifyResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.verifyResolution(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, result, 'Verification submitted', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function reopenComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.reopenComplaint(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, result, 'Complaint reopened', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function rateComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.rateComplaint(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, result, 'Rating submitted. Thank you for your feedback!', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const timeline = await complaintService.getTimeline(param(req, 'id'), req.user!);
    sendSuccess(res, timeline, 'Timeline retrieved', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const id = param(req, 'id');
    const complaint = await complaintRepo.findComplaintById(id);
    if (!complaint) { next(new Error('Complaint not found')); return; }

    const mimeType = req.file.mimetype;
    const mediaType = mimeType.startsWith('image/') ? 'IMAGE' as const
      : mimeType.startsWith('video/') ? 'VIDEO' as const
      : 'DOCUMENT' as const;

    const role = (req.body.role as 'COMPLAINT_EVIDENCE' | 'BEFORE_REPAIR' | 'AFTER_REPAIR' | 'OFFICER_REPORT') ?? 'COMPLAINT_EVIDENCE';
    const fileUrl = `/uploads/${req.file.filename}`;

    const media = await complaintRepo.addMedia({
      complaintId: id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      mediaType,
      role,
      uploadedById: req.user?.id,
    });

    await complaintRepo.addTimelineEvent({
      complaintId: id,
      eventType: 'MEDIA_UPLOADED',
      title: `Evidence uploaded`,
      description: `File "${req.file.originalname}" uploaded as ${role.replace(/_/g, ' ')}`,
      actorId: req.user?.id,
      actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
    });

    sendCreated(res, media, 'File uploaded successfully', req.requestId);
  } catch (err) { next(err); }
}

export async function assignComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.assignComplaint(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, result, 'Complaint assigned successfully', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function updateComplaintStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.updateComplaintStatus(param(req, 'id'), req.body, req.user!);
    sendSuccess(res, result, 'Status updated successfully', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function fieldOfficerVerifyWork(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await complaintService.fieldOfficerVerifyWork(param(req, 'id'), req.user!);
    sendSuccess(res, result, 'Work verified. Complaint sent to citizen for confirmation.', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function getLocationIntelligence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await locationIntelligenceService.analyzeLocation(param(req, 'id'));
    sendSuccess(res, result, 'Location intelligence computed', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}
