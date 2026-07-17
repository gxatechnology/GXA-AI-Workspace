import { PDFDocument, degrees } from 'pdf-lib';

export type DocumentKind = 'pdf' | 'text' | 'markdown';
export interface ExtractedPage { page: number; text: string }
export interface ProcessedDocument {
  kind: DocumentKind;
  mimeType: string;
  pageCount: number;
  pages: ExtractedPage[];
  encrypted: boolean;
  extractionMethod: 'native-pdf' | 'plain-text';
}

export class DocumentValidationError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_DOCUMENT') { super(message); }
}

export const DOCUMENT_TYPES = {
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'text/markdown': ['md', 'markdown']
} as const;

export function sanitizeFileName(name: string) {
  const base = name.replace(/\.\.+/g, '').replace(/[/\\:*?"<>|\u0000-\u001f]/g, '_').replace(/_+/g, '_').replace(/^\.+/, '').slice(0, 120).trim();
  return base || 'document';
}

export function decodeDocument(base64: unknown, maxBytes: number) {
  if (typeof base64 !== 'string' || !base64) throw new DocumentValidationError('Document data is required.');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new DocumentValidationError('The selected file is empty.', 400, 'EMPTY_FILE');
  if (buffer.length > maxBytes) throw new DocumentValidationError(`The file exceeds the configured ${Math.round(maxBytes / 1024 / 1024)} MB limit.`, 413, 'FILE_TOO_LARGE');
  return buffer;
}

export function validateDocumentSignature(name: string, mimeType: string, bytes: Uint8Array) {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const allowed = DOCUMENT_TYPES[mimeType as keyof typeof DOCUMENT_TYPES];
  if (!allowed || !(allowed as readonly string[]).includes(extension)) throw new DocumentValidationError('File extension and MIME type do not match a supported document.', 415, 'UNSUPPORTED_FILE');
  if (mimeType === 'application/pdf' && String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new DocumentValidationError('This file does not have a valid PDF signature.', 415, 'INVALID_SIGNATURE');
  if (mimeType.startsWith('text/') && bytes.slice(0, 512).some(value => value === 0)) throw new DocumentValidationError('Binary content cannot be processed as a text document.', 415, 'INVALID_SIGNATURE');
}

export async function processDocument(name: string, mimeType: string, bytes: Uint8Array, maxPages: number): Promise<ProcessedDocument> {
  validateDocumentSignature(name, mimeType, bytes);
  if (mimeType !== 'application/pdf') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return { kind: mimeType === 'text/markdown' ? 'markdown' : 'text', mimeType, pageCount: 1, pages: [{ page: 1, text }], encrypted: false, extractionMethod: 'plain-text' };
  }
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes, { ignoreEncryption: false }); }
  catch (error: any) {
    if (/encrypt/i.test(error?.message || '')) throw new DocumentValidationError('Password-protected or encrypted PDFs are not supported.', 422, 'ENCRYPTED_PDF');
    throw new DocumentValidationError('The PDF is corrupted or cannot be opened.', 422, 'CORRUPTED_PDF');
  }
  const pageCount = pdf.getPageCount();
  if (pageCount > maxPages) throw new DocumentValidationError(`This PDF has ${pageCount} pages; the configured limit is ${maxPages}.`, 413, 'PAGE_LIMIT');
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const source = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
    const pages: ExtractedPage[] = [];
    for (let index = 1; index <= source.numPages; index += 1) {
      const page = await source.getPage(index);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => typeof item.str === 'string' ? item.str : '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      pages.push({ page: index, text });
    }
    return { kind: 'pdf', mimeType, pageCount, pages, encrypted: false, extractionMethod: 'native-pdf' };
  } catch {
    return { kind: 'pdf', mimeType, pageCount, pages: Array.from({ length: pageCount }, (_, index) => ({ page: index + 1, text: '' })), encrypted: false, extractionMethod: 'native-pdf' };
  }
}

export function parsePageRanges(value: string, pageCount: number) {
  if (!value.trim()) throw new DocumentValidationError('Enter at least one page or page range.', 400, 'INVALID_PAGE_RANGE');
  const pages = new Set<number>();
  for (const token of value.split(',').map(part => part.trim())) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new DocumentValidationError(`Invalid page range: ${token}.`, 400, 'INVALID_PAGE_RANGE');
    const start = Number(match[1]); const end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > pageCount) throw new DocumentValidationError(`Page range ${token} is outside 1-${pageCount}.`, 400, 'INVALID_PAGE_RANGE');
    for (let page = start; page <= end; page += 1) pages.add(page);
  }
  return [...pages];
}

export function validatePageOrder(order: unknown, pageCount: number) {
  if (!Array.isArray(order) || order.length !== pageCount || order.some(value => !Number.isInteger(value) || value < 1 || value > pageCount) || new Set(order).size !== pageCount) throw new DocumentValidationError('Page order must contain every page exactly once.', 400, 'INVALID_PAGE_ORDER');
  return order as number[];
}

export async function transformPdf(sourceBytes: Uint8Array, operation: string, options: any) {
  const source = await PDFDocument.load(sourceBytes);
  const pageCount = source.getPageCount();
  let selected: number[];
  if (operation === 'reorder') selected = validatePageOrder(options.order, pageCount);
  else if (operation === 'delete') { const removed = parsePageRanges(String(options.pages || ''), pageCount); selected = Array.from({ length: pageCount }, (_, index) => index + 1).filter(page => !removed.includes(page)); if (!selected.length) throw new DocumentValidationError('At least one page must remain.', 400, 'DELETE_ALL_PAGES'); }
  else selected = parsePageRanges(String(options.pages || `1-${pageCount}`), pageCount);
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, selected.map(page => page - 1));
  copied.forEach(page => {
    if (operation === 'rotate') page.setRotation(degrees(((page.getRotation().angle + Number(options.degrees || 90)) % 360 + 360) % 360));
    output.addPage(page);
  });
  return output.save();
}

export async function mergePdfs(files: Uint8Array[]) {
  if (files.length < 2) throw new DocumentValidationError('Select at least two PDFs to merge.');
  const output = await PDFDocument.create();
  for (const bytes of files) { const source = await PDFDocument.load(bytes); const pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(page => output.addPage(page)); }
  return output.save();
}

export function retrievePages(pages: ExtractedPage[], query: string, limit = 4) {
  const terms = new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  return pages.map(page => ({ ...page, score: [...terms].reduce((score, term) => score + (page.text.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(page => page.text.trim()).sort((a, b) => b.score - a.score || a.page - b.page).slice(0, limit);
}
