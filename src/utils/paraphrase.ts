export interface ParaphrasePayload {
  text: string;
  mode: string;
  tone: string;
  sourceLanguage: string;
  outputLanguage: string;
  outputLength: 'shorter' | 'similar' | 'longer';
  synonymStrength: 'low' | 'balanced' | 'high';
  frozenTerms: string[];
  preserveFormatting: boolean;
  preserveCitations: boolean;
  readingLevel: string;
  customInstructions: string;
  requestId: string;
}

export interface ParaphraseResponse {
  text: string;
  missingFrozenTerms: string[];
  requestId: string;
  usage: { paraphrases: number };
}

export async function paraphraseContent(payload: ParaphrasePayload, user: any, signal?: AbortSignal): Promise<ParaphraseResponse> {
  const response = await fetch('/api/paraphrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(user?.sessionToken && !user?.guest ? { Authorization: `Bearer ${user.sessionToken}` } : {}) },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Paraphrasing failed.') as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
