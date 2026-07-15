export interface GeminiRequestOptions {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
}

export async function generateContent(options: GeminiRequestOptions): Promise<string> {
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error: any) {
    console.error('Error generating content from backend:', error);
    throw error;
  }
}
