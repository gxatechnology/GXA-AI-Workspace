import { authHeaders, storedUser } from './auth';

export type BackendAITool = 'summarizer' | 'growth_analysis' | 'marketing_analysis' | 'ai_writer' | 'technology_writer';

export interface AIRequestOptions {
  tool: BackendAITool;
  prompt: string;
}

export async function generateContent(options: AIRequestOptions): Promise<string> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(storedUser()) },
    body: JSON.stringify({ tool: options.tool, input: options.prompt }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }
  const data = await response.json();
  return data.text || '';
}
