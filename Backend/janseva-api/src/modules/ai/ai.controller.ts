import type { Request, Response, NextFunction } from 'express';
import * as aiService from './ai.service';
import * as complaintRepo from '../complaint/complaint.repository';
import { sendSuccess } from '../../utils/apiResponse';
import { BadRequestError, NotFoundError } from '../../utils/appError';

export async function analyzeComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, language } = req.body as { title: string; description: string; language?: string };
    if (!title || !description) throw new BadRequestError('title and description are required');

    const result = await aiService.analyzeComplaintLegacy(title, description, language);
    sendSuccess(res, result, 'Complaint analyzed successfully', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function translate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, targetLanguage } = req.body as { text: string; targetLanguage: string };
    if (!text || !targetLanguage) throw new BadRequestError('text and targetLanguage are required');

    const result = await aiService.translateText(text, targetLanguage);
    sendSuccess(res, result, 'Translation completed', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { messages, systemPrompt } = req.body as { messages: Array<{ role: 'user' | 'assistant'; content: string }>; systemPrompt?: string };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestError('messages array is required');
    }

    const result = await aiService.chatWithAssistant(messages, systemPrompt);
    sendSuccess(res, result, 'AI response generated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function verifyEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { complaintId, imageDescriptions } = req.body as { complaintId: string; imageDescriptions: string[] };

    const complaint = await complaintRepo.findComplaintById(complaintId);
    if (!complaint) throw new NotFoundError('Complaint');

    const result = await aiService.verifyEvidence(
      complaint.description,
      imageDescriptions ?? [],
    );

    // Update complaint with AI verification data
    await complaintRepo.updateComplaintStatus(complaintId, complaint.status, {
      aiSummary: result.summary,
      aiAnalyzedAt: new Date(),
    });

    sendSuccess(res, result, 'Evidence verified by AI', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text } = req.query as { text: string };
    if (!text) throw new BadRequestError('text query parameter is required');

    const suggestions = await aiService.generateComplaintSuggestions(text);
    sendSuccess(res, { suggestions }, 'Suggestions generated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}

export async function getOfficerResponseSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { complaintId, status } = req.body as { complaintId: string; status: string };
    const complaint = await complaintRepo.findComplaintById(complaintId);
    if (!complaint) throw new NotFoundError('Complaint');

    const suggestion = await aiService.generateOfficerResponseSuggestion(
      complaint.title,
      status ?? complaint.status,
    );
    sendSuccess(res, { suggestion }, 'Response suggestion generated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
}
