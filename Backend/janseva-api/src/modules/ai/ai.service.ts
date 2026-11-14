import { GroqProvider } from './providers/groq.provider';
import type { IAIProvider, AIChatMessage } from './providers/ai.interface';
import { logger } from '../../logger/winston';

// Factory — swap provider here without touching any other code
function createAIProvider(): IAIProvider {
  return new GroqProvider();
  // To switch: return new OpenAIProvider();
  // To switch: return new GeminiProvider();
}

const aiProvider: IAIProvider = createAIProvider();

// ─── AI Service Functions ──────────────────────────────────

import axios from 'axios';

export interface AIAnalysisResult {
  category: string;
  subcategory: string;
  department: string;
  confidence: number;
  priority: string;
  is_critical: boolean;
  risk_indicators: string[];
  is_duplicate: boolean;
  similar_complaints: any[];
}

export async function analyzeComplaintLegacy(
  title: string,
  description: string,
  language = 'en',
) {
  logger.info('AI analyzing complaint (Legacy)', { title: title.substring(0, 50) });
  return aiProvider.analyzeComplaint(title, description, language);
}

export async function analyzeComplaint(
  text: string,
  latitude?: number,
  longitude?: number,
): Promise<AIAnalysisResult | null> {
  try {
    const payload: any = { complaint: text };
    if (latitude !== undefined) payload.latitude = latitude;
    if (longitude !== undefined) payload.longitude = longitude;

    logger.info('Calling Python AI Engine for analysis');
    const response = await axios.post('http://localhost:8001/analyze', payload);
    return response.data as AIAnalysisResult;
  } catch (error: any) {
    logger.error('Failed to analyze complaint via AI Engine', { error: error.message });
    return null; // Gracefully return null if engine is down
  }
}

export async function translateText(text: string, targetLanguage: string) {
  logger.info('AI translating text', { targetLanguage, textLength: text.length });
  return aiProvider.translate(text, targetLanguage);
}

export async function chatWithAssistant(
  messages: AIChatMessage[],
  systemPrompt?: string,
) {
  return aiProvider.chat(messages, systemPrompt);
}

export async function verifyEvidence(
  complaintDescription: string,
  imageDescriptions: string[],
) {
  logger.info('AI verifying evidence', { imageCount: imageDescriptions.length });
  return aiProvider.verifyEvidence(complaintDescription, imageDescriptions);
}

export async function generateComplaintSuggestions(partialText: string): Promise<string[]> {
  const result = await aiProvider.chat([
    {
      role: 'user',
      content: `Generate 3 autocomplete suggestions for a citizen writing a civic complaint that starts with: "${partialText}". Reply ONLY with a JSON array of 3 suggestion strings.`,
    },
  ], 'You are a civic complaint writing assistant. Return ONLY a JSON array of exactly 3 short complaint title suggestions. No explanation.');

  try {
    const suggestions = JSON.parse(result.reply) as string[];
    return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export async function generateOfficerResponseSuggestion(
  complaintTitle: string,
  currentStatus: string,
): Promise<string> {
  const result = await aiProvider.chat([
    {
      role: 'user',
      content: `Generate a professional, empathetic response for a government officer to send to a citizen whose complaint "${complaintTitle}" is now in status "${currentStatus}". Keep it under 100 words, formal, and helpful.`,
    },
  ], 'You are a professional government communication assistant for India.');

  return result.reply;
}
