export type AIProviderId = 'openrouter' | 'openai' | 'gemini';
export type AIToolKey =
  | 'ai_chat'
  | 'ai_writer'
  | 'grammar_checker'
  | 'paraphraser'
  | 'summarizer'
  | 'translator'
  | 'resume_builder'
  | 'cover_letter'
  | 'business_writer'
  | 'marketing_writer'
  | 'marketing_analysis'
  | 'document_summary'
  | 'document_chat'
  | 'ai_humanizer'
  | 'growth_analysis'
  | 'technology_writer'
  | 'media_vision';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
};

export type AIRoutingPreferences = {
  order?: string[];
  allowFallbacks: boolean;
  requireParameters: boolean;
  dataCollection: 'allow' | 'deny';
  zeroDataRetention?: boolean;
  sort?: 'price' | 'throughput' | 'latency';
  maxPrice?: { prompt?: number; completion?: number; request?: number; image?: number };
};

export type AIProviderRequest = {
  requestId: string;
  tool: AIToolKey;
  modelIds: string[];
  messages: AIMessage[];
  temperature: number;
  maxOutputTokens: number;
  structuredOutput: boolean;
  timeoutMs: number;
  routing: AIRoutingPreferences;
  signal?: AbortSignal;
};

export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
};

export type AIProviderResult = {
  text: string;
  provider: AIProviderId;
  modelKey?: string;
  providerModelId: string;
  generationId?: string;
  usage: AIUsage;
  durationMs: number;
  fallbackUsed: boolean;
};

export type AIStreamChunk =
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: AIUsage; providerModelId?: string; generationId?: string };

export interface AIProviderAdapter {
  readonly id: AIProviderId;
  enabled(): boolean;
  configured(): boolean;
  generate(request: AIProviderRequest): Promise<AIProviderResult>;
  stream(request: AIProviderRequest): AsyncGenerator<AIStreamChunk>;
}

export class AIProviderError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryable = false,
    public provider?: AIProviderId,
  ) {
    super(code);
    this.name = 'AIProviderError';
  }
}

export function emptyUsage(): AIUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}
