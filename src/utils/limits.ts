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
  plans: Record<string, {
    name: string;
    monthlyPrice: number | null;
    priceLabel?: string;
    billing: string;
    features: string[];
    limits: { words: number; requests: number; pdfUploads: number; pdfSizeMb: number; pdfPages: number; ocrPages: number; storageMb: number; historyDays: number };
  }>;
  feature_locks: {
    academic: boolean;
    creative: boolean;
    professional: boolean;
    custom: boolean;
  };
  coupons: Array<{ code: string; discount: string }>;
  trial_days: number;
  promotions?: Array<{ id: string; message: string; active: boolean }>;
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
    pdf_uploads_limit: 3,
    ocr_pages_limit: 2,
    grammar_corrections_limit: 5,
    pricing_free: "₹0",
    pricing_pro: "₹99",
    pricing_pro_plus: "₹149",
    pricing_team: "Contact Sales",
    pricing_enterprise: "Custom Pricing",
    pricing_currency: "INR",
    plans: {},
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
