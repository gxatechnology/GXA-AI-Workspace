import type { PlanId } from './platformRegistry.js';

export interface AIModelDefinition {
  key: string;
  provider: 'openrouter' | 'openai' | 'gemini';
  providerModelId: string;
  displayName: string;
  supportedTools: string[];
  supportedModalities: Array<'text' | 'image' | 'document'>;
  supportedParameters: string[];
  contextLimit: number;
  outputLimit: number;
  requiredPlan: PlanId;
  active: boolean;
  defaultForTools: string[];
  fallbackModels: string[];
  costCategory: 'economy' | 'standard' | 'premium';
}

export interface AIToolRoute {
  primaryModel: string;
  fallbackModels: string[];
  inputLimit: number;
  outputLimit: number;
  temperature: number;
  structuredOutput: boolean;
  requiredPlan: PlanId;
  timeoutMs: number;
  privateData: boolean;
}
