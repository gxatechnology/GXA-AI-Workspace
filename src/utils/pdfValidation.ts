export interface PdfCandidate { name: string; type: string; size: number }
export type PdfValidationResult = { valid: true } | { valid: false; code: 'extension' | 'mime' | 'empty' | 'size'; message: string };

export function validatePdfFile(file: PdfCandidate, maxSizeMb: number): PdfValidationResult {
  if (!file.name.toLowerCase().endsWith('.pdf')) return { valid: false, code: 'extension', message: 'Choose a file with a .pdf extension.' };
  if (file.type !== 'application/pdf') return { valid: false, code: 'mime', message: 'The selected file is not identified as a PDF.' };
  if (!Number.isFinite(file.size) || file.size <= 0) return { valid: false, code: 'empty', message: 'The selected PDF is empty.' };
  if (file.size > maxSizeMb * 1024 * 1024) return { valid: false, code: 'size', message: `This PDF exceeds the ${maxSizeMb} MB file limit.` };
  return { valid: true };
}
