export interface SystemConfig {
  paraphrases_limit: number;
  paraphrase_word_limit: number;
  ai_chats_limit: number;
  chat_message_character_limit: number;
  chat_attachment_limit: number;
  chat_attachment_size_mb: number;
  chat_history_enabled: boolean;
  chat_models: Array<{ id: string; name: string; multimodal: boolean; plan: string }>;
  pdf_uploads_limit: number;
  ocr_pages_limit: number;
  document_upload_size_mb: number;
  document_page_limit: number;
  document_file_count_limit: number;
  document_supported_types: string[];
  grammar_corrections_limit: number;
  originality_daily_limit: number;
  originality_character_limit: number;
  translation_daily_limit: number;
  translation_character_limit: number;
  writer_generations_limit: number;
  writer_input_word_limit: number;
  writer_output_word_limit: number;
  pricing_free: string;
  pricing_pro: string;
  pricing_pro_plus: string;
  pricing_team: string;
  pricing_enterprise: string;
  pricing_currency: string;
  pricing_pro_monthly?: string;
  pricing_pro_yearly?: string;
  feature_locks: {
    academic: boolean;
    creative: boolean;
    professional: boolean;
    custom: boolean;
  };
  coupons: Array<{ code: string; discount: string }>;
  trial_days: number;
  upgrade_message: string;
}

export interface UsageStats {
  paraphrases: number;
  chats: number;
  pdf_uploads: number;
  ocr_pages: number;
  grammar_corrections: number;
  writer_generations?: number;
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  try {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const data = await res.json();
      return data.config;
    }
  } catch (err) {
    console.error('Failed to fetch admin config:', err);
  }
  return {
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    chat_message_character_limit: 20000,
    chat_attachment_limit: 3,
    chat_attachment_size_mb: 10,
    chat_history_enabled: true,
    chat_models: [{ id: 'default', name: 'GXA AI', multimodal: false, plan: 'free' }],
    pdf_uploads_limit: 3,
    ocr_pages_limit: 2,
    document_upload_size_mb: 10,
    document_page_limit: 100,
    document_file_count_limit: 5,
    document_supported_types: ['application/pdf', 'text/plain', 'text/markdown'],
    grammar_corrections_limit: 5,
    originality_daily_limit: 5,
    originality_character_limit: 30000,
    translation_daily_limit: 10,
    translation_character_limit: 20000,
    writer_generations_limit: 5,
    writer_input_word_limit: 1500,
    writer_output_word_limit: 1200,
    pricing_free: "₹0",
    pricing_pro: "₹99",
    pricing_pro_plus: "₹149",
    pricing_team: "Contact Sales",
    pricing_enterprise: "Custom Pricing",
    pricing_currency: "INR",
    feature_locks: {
      academic: true,
      creative: true,
      professional: true,
      custom: true
    },
    coupons: [{ code: "GXA40", discount: "40%" }],
    trial_days: 14,
    upgrade_message: "Join thousands of technical writers, marketers, and SaaS teams executing with GXA Technologies."
  };
}

import { authHeaders, storedUser } from './auth';

const resolveUser = (user: any) => typeof user === 'object' && user ? user : storedUser();

export async function fetchUsage(user?: any): Promise<UsageStats> {
  try {
    const res = await fetch('/api/usage', {
      headers: authHeaders(resolveUser(user))
    });
    if (res.ok) {
      const data = await res.json();
      return data.usage;
    }
  } catch (err) {
    console.error('Failed to fetch usage:', err);
  }
  return {
    paraphrases: 0,
    chats: 0,
    pdf_uploads: 0,
    ocr_pages: 0,
    grammar_corrections: 0,
    writer_generations: 0
  };
}

export async function incrementUsage(user: any, type: keyof UsageStats, count = 1): Promise<UsageStats> {
  try {
    const res = await fetch('/api/usage/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(resolveUser(user)) },
      body: JSON.stringify({ type, count })
    });
    if (res.ok) {
      const data = await res.json();
      return data.usage;
    }
  } catch (err) {
    console.error('Failed to increment usage:', err);
  }
  return {
    paraphrases: 0,
    chats: 0,
    pdf_uploads: 0,
    ocr_pages: 0,
    grammar_corrections: 0,
    writer_generations: 0
  };
}

export function isUserPremium(user: any): boolean {
  if (!user) return false;
  const sub = String(user.subscription || '').toLowerCase();
  return ['pro', 'pro plus', 'pro_plus', 'premium', 'team', 'enterprise'].includes(sub);
}
