export interface GrammarCheckPayload {
  text: string; language: string; categories: string[]; ignoredRules: string[]; dictionary: string[];
  mode: 'manual' | 'realtime'; requestId: string; documentVersion: number;
  goals: { audience: string; formality: string; intent: string; domain: string };
}

export async function checkGrammar(payload: GrammarCheckPayload, user: any, signal?: AbortSignal) {
  const response = await fetch('/api/grammar/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(user?.sessionToken && !user?.guest ? { Authorization: `Bearer ${user.sessionToken}` } : {}) },
    body: JSON.stringify(payload), signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Grammar analysis failed.') as Error & { status?: number; code?: string };
    error.status = response.status; error.code = data.code; throw error;
  }
  return data;
}
