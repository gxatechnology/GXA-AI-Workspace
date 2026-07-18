import {
  MEDIA_ASPECT_RATIOS,
  MEDIA_QUALITIES,
  MEDIA_STYLES,
  MEDIA_TOOLS,
  getMediaTool,
  type MediaPlan,
  type MediaToolDefinition,
} from '../shared/mediaRegistry.js';

export class MediaValidationError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_MEDIA_REQUEST') {
    super(message);
  }
}

export interface ValidatedImage {
  data: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: number;
}

const clean = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const PLAN_RANK: Record<MediaPlan, number> = { free: 0, pro: 1, pro_plus: 2 };

export function normalizeMediaPlan(value: unknown): MediaPlan {
  const plan = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (['pro_plus', 'premium', 'team', 'enterprise'].includes(plan)) return 'pro_plus';
  if (plan === 'pro') return 'pro';
  return 'free';
}

export function assertMediaEntitlement(tool: MediaToolDefinition, plan: MediaPlan) {
  if (PLAN_RANK[plan] < PLAN_RANK[tool.requiredPlan]) {
    const label = tool.requiredPlan === 'pro_plus' ? 'Pro Plus' : 'Pro';
    throw new MediaValidationError(`${tool.name} requires ${label}. Your image and prompt are preserved.`, 403, 'PREMIUM_MEDIA_TOOL');
  }
}

const signatures: Record<ValidatedImage['mimeType'], (bytes: Buffer) => boolean> = {
  'image/png': (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/jpeg': (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/webp': (bytes) => bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
};

export function validateImageData(value: unknown, maxSizeMb = 10): ValidatedImage {
  if (typeof value !== 'string') throw new MediaValidationError('A PNG, JPEG or WebP image is required.', 400, 'IMAGE_REQUIRED');
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new MediaValidationError('Use a valid PNG, JPEG or WebP image.', 415, 'UNSUPPORTED_IMAGE');
  const mimeType = match[1] as ValidatedImage['mimeType'];
  const data = match[2];
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || !signatures[mimeType](bytes)) {
    throw new MediaValidationError('The file content does not match its declared image type.', 415, 'INVALID_IMAGE_SIGNATURE');
  }
  if (bytes.length > maxSizeMb * 1024 * 1024) {
    throw new MediaValidationError(`The image exceeds the configured ${maxSizeMb} MB limit.`, 413, 'IMAGE_SIZE_LIMIT');
  }
  return { data, mimeType, bytes: bytes.length };
}

function requireTool(value: unknown, operation?: MediaToolDefinition['operation'], configuredTools: MediaToolDefinition[] = MEDIA_TOOLS) {
  const tool = configuredTools.find((candidate) => candidate.id === clean(value, 80));
  if (!tool || (operation && tool.operation !== operation)) {
    throw new MediaValidationError('Select an available Media Studio tool.', 400, 'UNKNOWN_MEDIA_TOOL');
  }
  return tool;
}

function rejectImitation(prompt: string) {
  if (/\b(in the (?:exact )?style of|copy|clone|replicate|identical to)\b.{0,80}\b(artist|logo|brand|trademark|character|artwork)\b/i.test(prompt)
    || /\b(copy|clone|replicate)\b.{0,80}\b(logo|brand identity|trademark)\b/i.test(prompt)) {
    throw new MediaValidationError('Create an original direction instead of copying a protected artist, logo, brand, character or artwork.', 400, 'IMITATION_REQUEST');
  }
}

export function validateGenerateRequest(body: any, plan: MediaPlan, characterLimit = 4000, maxBatch = 4, configuredTools: MediaToolDefinition[] = MEDIA_TOOLS) {
  const tool = requireTool(body?.toolId, undefined, configuredTools);
  if (tool.operation !== 'generate') throw new MediaValidationError('This tool requires a different media workflow.', 400, 'WRONG_MEDIA_OPERATION');
  assertMediaEntitlement(tool, plan);
  const prompt = clean(body?.prompt, characterLimit);
  if (!prompt) throw new MediaValidationError('Describe the visual you want to create.', 400, 'PROMPT_REQUIRED');
  rejectImitation(prompt);
  const aspectRatio = MEDIA_ASPECT_RATIOS.includes(body?.aspectRatio) ? body.aspectRatio : '1:1';
  const quality = MEDIA_QUALITIES.includes(body?.quality) ? body.quality : '1K';
  const style = MEDIA_STYLES.includes(body?.style) ? body.style : 'Natural';
  const batch = Math.max(1, Math.min(Number(body?.batch) || 1, Math.max(1, maxBatch)));
  return {
    tool,
    prompt,
    negativePrompt: clean(body?.negativePrompt, 1000),
    aspectRatio,
    quality,
    style,
    batch,
    seed: Number.isFinite(Number(body?.seed)) ? Math.trunc(Number(body.seed)) : null,
  };
}

export function buildGeneratePrompt(request: ReturnType<typeof validateGenerateRequest>, brandKit?: any) {
  const brand = brandKit ? {
    companyName: clean(brandKit.companyName, 100),
    tagline: clean(brandKit.tagline, 200),
    tone: clean(brandKit.tone, 100),
    brandColors: Array.isArray(brandKit.brandColors) ? brandKit.brandColors.map((item: unknown) => clean(item, 40)).filter(Boolean).slice(0, 8) : [],
  } : null;
  return {
    systemInstruction: [
      'Create an original production-ready visual from the supplied brief.',
      'Do not imitate a named artist, copyrighted artwork, protected character, logo, trademark, or another brand identity.',
      'Do not invent product claims, prices, statistics, endorsements, event details, or certification data.',
      'Render text only when explicitly supplied; keep it accurate and legible where possible.',
      'For logos, create an original concept and avoid confusing similarity to existing marks.',
    ].join(' '),
    prompt: [
      `MEDIA TOOL: ${request.tool.name}`,
      `STYLE DIRECTION: ${request.style}`,
      `NEGATIVE DIRECTION: ${request.negativePrompt || 'None supplied'}`,
      `SEED HINT: ${request.seed ?? 'Provider default'}`,
      `BRAND KIT: ${JSON.stringify(brand)}`,
      '',
      '<untrusted_visual_brief>',
      request.prompt,
      '</untrusted_visual_brief>',
    ].join('\n'),
  };
}

export function validateEditRequest(body: any, plan: MediaPlan, maxSizeMb = 10, characterLimit = 4000, configuredTools: MediaToolDefinition[] = MEDIA_TOOLS) {
  const tool = requireTool(body?.toolId, 'edit', configuredTools);
  assertMediaEntitlement(tool, plan);
  const image = validateImageData(body?.image, maxSizeMb);
  const prompt = clean(body?.prompt, characterLimit);
  if (tool.id === 'watermark-owned-remove' && body?.ownsWatermark !== true) {
    throw new MediaValidationError('Confirm that you own or are authorized to remove this watermark.', 400, 'WATERMARK_OWNERSHIP_REQUIRED');
  }
  rejectImitation(prompt);
  return { tool, image, prompt };
}

export function buildEditPrompt(request: ReturnType<typeof validateEditRequest>) {
  const specific: Record<string, string> = {
    'background-remove': 'Remove the background. Return a clean isolated subject with transparency where supported.',
    'background-replace': `Replace only the background with: ${request.prompt || 'a clean neutral background'}. Preserve the subject.`,
    upscale: 'Enhance perceived clarity and detail. Do not alter identity, labels, or factual content.',
    restore: 'Repair visible age-related damage while preserving identity, composition and historical details. Do not invent missing facts.',
    'object-remove': `Remove only this user-described object: ${request.prompt}. Reconstruct the immediate surrounding area naturally.`,
    lighting: `Adjust lighting and color as requested: ${request.prompt || 'balanced natural lighting and color'}.`,
    'watermark-owned-remove': `Remove only the watermark the user confirmed they own: ${request.prompt || 'the visible owned watermark'}. Preserve all unrelated content.`,
    'image-variations': `Create an original variation: ${request.prompt || 'preserve the subject and vary composition subtly'}.`,
    'brand-variants': 'Create a clean original monochrome brand-asset variant suitable for light and dark backgrounds.',
  };
  return {
    systemInstruction: 'Edit only the user-supplied image. Preserve identity, factual content and unrelated regions. Never remove third-party ownership marks or imitate a protected brand.',
    prompt: specific[request.tool.id] || request.prompt || request.tool.description,
  };
}

export function validateVisionRequest(body: any, plan: MediaPlan, maxSizeMb = 10, characterLimit = 4000, configuredTools: MediaToolDefinition[] = MEDIA_TOOLS) {
  const tool = requireTool(body?.toolId, undefined, configuredTools);
  if (tool.operation !== 'vision') throw new MediaValidationError('This tool is not a visual-analysis workflow.', 400, 'WRONG_MEDIA_OPERATION');
  assertMediaEntitlement(tool, plan);
  const image = validateImageData(body?.image, maxSizeMb);
  return {
    tool,
    image,
    question: clean(body?.question, characterLimit),
    targetLanguage: clean(body?.targetLanguage, 80) || 'English',
  };
}

export function buildVisionPrompt(request: ReturnType<typeof validateVisionRequest>) {
  const instructions: Record<string, string> = {
    'ocr-printed': 'Transcribe all visible printed text. Preserve reading order and use Markdown. Mark uncertain text as [uncertain].',
    'ocr-handwriting': 'Transcribe visible handwriting. Preserve line breaks. Mark every ambiguous word or symbol as [uncertain].',
    'ocr-table': 'Transcribe visible tables as Markdown tables. Never invent missing cells; use [unreadable].',
    'ocr-receipt': 'Extract only visible merchant, date, currency, line items, tax, total and payment fields. Use [unreadable] for uncertainty.',
    'ocr-invoice': 'Extract only visible supplier, customer, invoice number, dates, currency, line items, tax and totals. Use [unreadable] for uncertainty.',
    'ocr-business-card': 'Extract only visible name, role, company, phone, email, website and address fields.',
    'ocr-id': 'Extract only visible fields. Do not infer hidden values, verify identity, assess authenticity or retain biometric information.',
    'ocr-whiteboard': 'Transcribe visible whiteboard notes and describe obvious spatial groupings. Mark ambiguous writing.',
    'ocr-math': 'Transcribe visible mathematics in LaTeX and plain language. Flag ambiguous symbols instead of guessing.',
    'image-translate': `Extract all visible source text in reading order. Preserve headings and line breaks, use [uncertain] instead of guessing, and do not translate yet. The configured Translation Studio will translate the extraction to ${request.targetLanguage}.`,
    caption: 'Write one concise factual caption using only visible evidence.',
    description: 'Describe visible subjects, setting, layout, text and uncertainty. Separate observation from inference.',
    'visual-question': `Answer this question using only visible evidence: ${request.question || 'What is visible in this image?'}`,
    'chart-analysis': 'Explain visible chart type, labels, units, data points and trends. Do not estimate unreadable values or imply causation.',
    'diagram-analysis': 'Explain visible nodes, labels, direction and relationships. Mark unclear connectors or labels.',
    'screenshot-analysis': `Review this application screenshot. Address: ${request.question || 'structure, usability and visible issues'}. Do not claim behavior not visible.`,
    'website-analysis': `Review this website screenshot. Address: ${request.question || 'content hierarchy, usability and responsive risks'}. Do not claim behavior not visible.`,
    accessibility: 'Create concise alt text, then list visually evident accessibility concerns. Do not infer protected traits.',
  };
  return {
    systemInstruction: 'You are GXA Document Vision. Analyze only the supplied image. Never fabricate text, numbers, sources, identities or hidden details. OCR is probabilistic and must identify uncertainty rather than claim perfect accuracy.',
    prompt: instructions[request.tool.id] || request.tool.description,
  };
}

export function safeMediaAsset(body: any, ownerId: string, maxSizeMb = 10) {
  const image = validateImageData(body?.image, maxSizeMb);
  const projectId = clean(body?.projectId, 100) || null;
  return {
    ownerId,
    title: clean(body?.title, 100) || 'Media asset',
    toolId: clean(body?.toolId, 80),
    mimeType: image.mimeType,
    image: `data:${image.mimeType};base64,${image.data}`,
    projectId,
    tags: Array.isArray(body?.tags) ? body.tags.map((tag: unknown) => clean(tag, 40)).filter(Boolean).slice(0, 12) : [],
    folder: clean(body?.folder, 80),
    source: ['generated', 'uploaded', 'edited', 'ocr', 'exported', 'vector'].includes(body?.source) ? body.source : 'uploaded',
  };
}

export function publicMediaTools(configured: unknown) {
  if (!Array.isArray(configured)) return MEDIA_TOOLS;
  return configured.flatMap((entry): MediaToolDefinition[] => {
    const id = typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? String((entry as any).id || '') : '';
    const base = getMediaTool(id);
    if (!base || (typeof entry === 'object' && (entry as any).enabled === false)) return [];
    const configuredPlan = typeof entry === 'object' && ['free', 'pro', 'pro_plus'].includes((entry as any).requiredPlan)
      ? (entry as any).requiredPlan as MediaPlan : base.requiredPlan;
    return [{ ...base, requiredPlan: configuredPlan }];
  });
}
