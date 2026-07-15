export interface SystemConfig {
  paraphrases_limit: number;
  paraphrase_word_limit: number;
  ai_chats_limit: number;
  pdf_uploads_limit: number;
  ocr_pages_limit: number;
  grammar_corrections_limit: number;
  pricing_free: string;
  pricing_pro: string;
  pricing_pro_plus: string;
  pricing_team: string;
  pricing_enterprise: string;
  pricing_currency: string;
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
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  const res = await fetch('/api/admin/config');
  if (!res.ok) throw new Error(`Unable to load backend configuration (${res.status})`);
  const data = await res.json();
  return data.config;
}

export async function fetchUsage(userEmail: string): Promise<UsageStats> {
  try {
    const res = await fetch('/api/usage', {
      headers: {
        'Authorization': `Bearer ${userEmail}`
      }
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
    grammar_corrections: 0
  };
}

export async function incrementUsage(userEmail: string, type: keyof UsageStats, count = 1): Promise<UsageStats> {
  try {
    const res = await fetch('/api/usage/increment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userEmail}`
      },
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
    grammar_corrections: 0
  };
}

export function isUserPremium(user: any): boolean {
  if (!user) return false;
  const sub = String(user.subscription || '').toLowerCase();
  return sub === 'pro' || sub === 'premium' || sub === 'enterprise';
}
