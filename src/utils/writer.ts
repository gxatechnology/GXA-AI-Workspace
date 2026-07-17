export interface WriterGenerateRequest {
  templateId: string;
  fields: Record<string, string>;
  tone: string;
  language: string;
  length: string;
  audience: string;
  purpose: string;
  keywords: string[];
  customInstructions: string;
  existingContent: string;
  selectedText: string;
  mode: 'generate' | 'continue' | 'improve' | 'expand' | 'shorten' | 'rewrite' | 'outline' | 'section' | 'inline';
  sectionId?: string;
  requestId: string;
}

export interface WriterGenerateResponse {
  text: string;
  templateId: string;
  mode: string;
  words: number;
  requestId: string;
  usage: { writer_generations: number };
}

export class WriterApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public field?: string) {
    super(message);
  }
}

export async function generateWriterContent(request: WriterGenerateRequest, signal?: AbortSignal): Promise<WriterGenerateResponse> {
  const user = JSON.parse(localStorage.getItem('gxa_user') || 'null');
  const response = await fetch('/api/writer/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(user?.email ? { Authorization: `Bearer ${user.email}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new WriterApiError(payload.error || 'The writing request failed.', response.status, payload.code, payload.field);
  return payload as WriterGenerateResponse;
}
