import { Router } from 'express';
import * as aiController from './ai.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { aiRateLimiter } from '../../middleware/rateLimiter';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(aiRateLimiter);

const analyzeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  language: z.string().optional(),
});

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLanguage: z.string().min(2).max(10),
});

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
  systemPrompt: z.string().max(1000).optional(),
});

const verifyEvidenceSchema = z.object({
  complaintId: z.string().uuid(),
  imageDescriptions: z.array(z.string().max(1000)).max(10),
});

const officerSuggestionSchema = z.object({
  complaintId: z.string().uuid(),
  status: z.string().optional(),
});

/**
 * @swagger
 * /ai/analyze:
 *   post:
 *     tags: [AI]
 *     summary: Analyze complaint with AI — returns category, priority, department
 */
router.post('/analyze', authenticate, validate(analyzeSchema), aiController.analyzeComplaint);

/**
 * @swagger
 * /ai/translate:
 *   post:
 *     tags: [AI]
 *     summary: Translate text to specified language
 */
router.post('/translate', optionalAuthenticate, validate(translateSchema), aiController.translate);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with JanSeva AI assistant
 */
router.post('/chat', optionalAuthenticate, validate(chatSchema), aiController.chat);

/**
 * @swagger
 * /ai/verify-evidence:
 *   post:
 *     tags: [AI]
 *     summary: AI verification of complaint evidence photos
 */
router.post('/verify-evidence', authenticate, validate(verifyEvidenceSchema), aiController.verifyEvidence);

/**
 * @swagger
 * /ai/suggestions:
 *   get:
 *     tags: [AI]
 *     summary: Get AI autocomplete suggestions for complaint title
 */
router.get('/suggestions', optionalAuthenticate, aiController.getSuggestions);

/**
 * @swagger
 * /ai/officer-response:
 *   post:
 *     tags: [AI]
 *     summary: Generate AI response suggestion for officers
 */
router.post(
  '/officer-response',
  authenticate,
  validate(officerSuggestionSchema),
  aiController.getOfficerResponseSuggestion,
);

export default router;
