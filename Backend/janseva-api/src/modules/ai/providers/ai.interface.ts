// AI Provider Interface — swap any LLM without changing business logic

export interface AIAnalysisResult {
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  estimatedResolutionDays: number;
  confidence: number; // 0-1
}

export interface AITranslationResult {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatResult {
  reply: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface AIVerificationResult {
  isValid: boolean;
  locationMatched: boolean;
  categoryMatched: boolean;
  repairEvidenceDetected: boolean;
  summary: string;
  confidence: number;
}

export interface IAIProvider {
  analyzeComplaint(title: string, description: string, language?: string): Promise<AIAnalysisResult>;
  translate(text: string, targetLanguage: string): Promise<AITranslationResult>;
  chat(messages: AIChatMessage[], systemPrompt?: string): Promise<AIChatResult>;
  verifyEvidence(complaintDescription: string, imageDescriptions: string[]): Promise<AIVerificationResult>;
  transcribeVoice?(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
