import Groq from 'groq-sdk';
import { env } from '../../../config/environment';
import { logger } from '../../../logger/winston';
import type {
  IAIProvider,
  AIAnalysisResult,
  AITranslationResult,
  AIChatMessage,
  AIChatResult,
  AIVerificationResult,
} from './ai.interface';

export class GroqProvider implements IAIProvider {
  private client: Groq;
  private model: string;

  constructor() {
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
    this.model = env.GROQ_MODEL;
  }

  // ─── Analyze Complaint ─────────────────────────────────

  async analyzeComplaint(
    title: string,
    description: string,
    language = 'en',
  ): Promise<AIAnalysisResult> {
    const systemPrompt = `You are an expert AI system for the Indian Government's JanSeva AI grievance redressal platform.
Analyze citizen complaints and classify them accurately. 
You MUST respond with ONLY valid JSON matching this exact schema:
{
  "category": "string (one of: WATER_SUPPLY, ELECTRICITY, GARBAGE_SANITATION, ROADS_INFRASTRUCTURE, DRAINAGE_SEWAGE, STREET_LIGHTS, PARKS_RECREATION, BUILDING_PERMITS, NOISE_POLLUTION, AIR_POLLUTION, PUBLIC_TRANSPORT, LAW_AND_ORDER, HEALTH_SERVICES, EDUCATION, OTHER)",
  "priority": "string (one of: LOW, MEDIUM, HIGH, CRITICAL)",
  "department": "string (government department name)",
  "summary": "string (1-2 sentence summary in English)",
  "keywords": "array of 3-5 relevant keywords",
  "sentiment": "string (one of: positive, neutral, negative, frustrated)",
  "estimatedResolutionDays": "number (realistic estimate)",
  "confidence": "number (0 to 1)"
}

Priority guidelines:
- CRITICAL: Safety hazard, health emergency, or large area affected
- HIGH: Major inconvenience affecting daily life
- MEDIUM: Moderate issue needing attention
- LOW: Minor issue or suggestion`;

    const userMessage = `Complaint Title: ${title}\nComplaint Description: ${description}\nLanguage: ${language}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: env.GROQ_MAX_TOKENS,
        temperature: 0.1, // Low temperature for consistent classification
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      const parsed = JSON.parse(content) as AIAnalysisResult;
      logger.info('AI complaint analysis completed', { title, category: parsed.category });
      return parsed;
    } catch (error) {
      logger.error('Groq complaint analysis failed', { error });
      // Return sensible defaults on failure — never crash the complaint creation
      return {
        category: 'OTHER',
        priority: 'MEDIUM',
        department: 'Ministry of Housing and Urban Affairs',
        summary: 'Citizen complaint submitted and pending review.',
        keywords: ['complaint', 'civic', 'issue'],
        sentiment: 'neutral',
        estimatedResolutionDays: 7,
        confidence: 0,
      };
    }
  }

  // ─── Translate ─────────────────────────────────────────

  async translate(text: string, targetLanguage: string): Promise<AITranslationResult> {
    const systemPrompt = `You are a professional translation assistant for an Indian government platform.
Translate the given text to ${targetLanguage}. Also detect the source language.
Respond ONLY with valid JSON:
{
  "translatedText": "string",
  "detectedLanguage": "string (ISO 639-1 code like 'hi', 'en', 'ta', etc.)",
  "confidence": number (0 to 1)
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate: "${text}"` },
        ],
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      return JSON.parse(content) as AITranslationResult;
    } catch (error) {
      logger.error('Groq translation failed', { error });
      return { translatedText: text, detectedLanguage: 'unknown', confidence: 0 };
    }
  }

  // ─── Chat ──────────────────────────────────────────────

  async chat(messages: AIChatMessage[], systemPrompt?: string): Promise<AIChatResult> {
    const defaultSystemPrompt = `You are JanSeva AI Assistant, a helpful government citizen services bot for India.
You assist citizens with:
- Filing and tracking civic complaints (water supply, electricity, roads, garbage, etc.)
- Understanding government services and departments
- Explaining complaint statuses and next steps
- General civic information

Be helpful, empathetic, and professional. Keep responses concise and actionable.
Always respond in the same language the user writes in.
If asked about specific complaint IDs or personal data, tell them to log in and check the complaints section.`;

    const groqMessages = [
      { role: 'system' as const, content: systemPrompt ?? defaultSystemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: groqMessages,
        max_tokens: 800,
        temperature: env.GROQ_TEMPERATURE,
      });

      return {
        reply: response.choices[0]?.message?.content ?? 'I am unable to respond at this time.',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Groq chat failed', { error });
      throw new Error('AI chat service temporarily unavailable');
    }
  }

  // ─── Verify Evidence ───────────────────────────────────

  async verifyEvidence(
    complaintDescription: string,
    imageDescriptions: string[],
  ): Promise<AIVerificationResult> {
    const systemPrompt = `You are an AI verification system for the Indian Government's JanSeva AI platform.
Verify if the provided work evidence matches the original complaint.
Respond ONLY with valid JSON:
{
  "isValid": boolean,
  "locationMatched": boolean,
  "categoryMatched": boolean,
  "repairEvidenceDetected": boolean,
  "summary": "string (1-2 sentence AI verification summary)",
  "confidence": number (0 to 1)
}`;

    const userMessage = `Original Complaint: ${complaintDescription}\n\nEvidence/Images Description:\n${imageDescriptions.map((d, i) => `Image ${i + 1}: ${d}`).join('\n')}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');

      return JSON.parse(content) as AIVerificationResult;
    } catch (error) {
      logger.error('Groq evidence verification failed', { error });
      return {
        isValid: false,
        locationMatched: false,
        categoryMatched: false,
        repairEvidenceDetected: false,
        summary: 'AI verification unavailable. Please verify manually.',
        confidence: 0,
      };
    }
  }
}
