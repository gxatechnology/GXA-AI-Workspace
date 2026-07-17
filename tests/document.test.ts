import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { decodeDocument, mergePdfs, parsePageRanges, processDocument, retrievePages, sanitizeFileName, transformPdf, validateDocumentSignature, validatePageOrder } from '../server/document.js';

test('document validation rejects empty, oversized, mismatched and forged files', () => {
  assert.throws(() => decodeDocument('', 10), /required/);
  assert.throws(() => decodeDocument(Buffer.from('too large').toString('base64'), 2), /configured/);
  assert.throws(() => validateDocumentSignature('file.txt', 'application/pdf', new TextEncoder().encode('hello')), /extension and MIME/);
  assert.throws(() => validateDocumentSignature('file.pdf', 'application/pdf', new TextEncoder().encode('hello')), /valid PDF signature/);
});

test('filenames are safe for downloads', () => {
  assert.equal(sanitizeFileName('../../report?.pdf'), '_report_.pdf');
  assert.equal(sanitizeFileName(''), 'document');
});

test('text extraction preserves real content and page metadata', async () => {
  const processed = await processDocument('notes.txt', 'text/plain', new TextEncoder().encode('Hindi हिन्दी\nFacts'), 5);
  assert.equal(processed.pageCount, 1); assert.equal(processed.pages[0].text, 'Hindi हिन्दी\nFacts'); assert.equal(processed.extractionMethod, 'plain-text');
});

test('page range and order validation reject unsafe indexes', () => {
  assert.deepEqual(parsePageRanges('1-3, 5', 5), [1, 2, 3, 5]);
  assert.throws(() => parsePageRanges('0', 5), /outside/);
  assert.throws(() => parsePageRanges('4-2', 5), /outside/);
  assert.deepEqual(validatePageOrder([3, 1, 2], 3), [3, 1, 2]);
  assert.throws(() => validatePageOrder([1, 1, 2], 3), /exactly once/);
});

test('PDF operations create derived outputs and preserve the source', async () => {
  const source = await PDFDocument.create(); source.addPage(); source.addPage(); source.addPage(); const bytes = await source.save();
  const extracted = await transformPdf(bytes, 'extract', { pages: '1,3' }); const extractedPdf = await PDFDocument.load(extracted); assert.equal(extractedPdf.getPageCount(), 2);
  const deleted = await transformPdf(bytes, 'delete', { pages: '2' }); assert.equal((await PDFDocument.load(deleted)).getPageCount(), 2);
  const rotated = await transformPdf(bytes, 'rotate', { pages: '1', degrees: 90 }); assert.equal((await PDFDocument.load(rotated)).getPage(0).getRotation().angle, 90);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 3);
});

test('merge uses actual PDF pages in file order', async () => {
  const a = await PDFDocument.create(); a.addPage(); const b = await PDFDocument.create(); b.addPage(); b.addPage();
  const merged = await mergePdfs([await a.save(), await b.save()]); assert.equal((await PDFDocument.load(merged)).getPageCount(), 3);
});

test('retrieval returns only real page text and source page numbers', () => {
  const pages = [{ page: 1, text: 'Revenue increased.' }, { page: 2, text: 'Security controls changed.' }, { page: 3, text: '' }];
  const result = retrievePages(pages, 'security controls'); assert.equal(result[0].page, 2); assert.ok(result.every(page => page.text));
});
