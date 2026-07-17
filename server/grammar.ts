export const CORE_GRAMMAR_CATEGORIES = new Set(['Grammar', 'Spelling', 'Punctuation', 'Capitalization']);
export const SUPPORTED_GRAMMAR_CATEGORIES = new Set([
  ...CORE_GRAMMAR_CATEGORIES,
  'Sentence Structure', 'Agreement', 'Tense', 'Articles', 'Prepositions', 'Pronouns', 'Word Choice',
  'Clarity', 'Fluency', 'Conciseness', 'Style', 'Tone', 'Formality', 'Readability', 'Vocabulary',
  'Repetition', 'Passive Voice', 'Redundancy', 'Wordiness', 'Consistency', 'Formatting',
]);
export const SUPPORTED_GRAMMAR_LANGUAGES = new Set(['English', 'English (US)', 'English (UK)', 'English (India)', 'Spanish', 'French', 'German', 'Italian', 'Hindi', 'Hinglish']);

export interface GrammarCheckRequest {
  text: string;
  language: string;
  categories: string[];
  ignoredRules: string[];
  dictionary: string[];
  mode: 'manual' | 'realtime';
  requestId: string;
  documentVersion: number;
  goals: { audience: string; formality: string; intent: string; domain: string };
}

export interface GrammarIssue {
  id: string;
  category: string;
  severity: 'error' | 'warning' | 'suggestion';
  startOffset: number;
  endOffset: number;
  originalText: string;
  replacements: string[];
  title: string;
  explanation: string;
  ruleId: string;
  confidence: number;
  sentenceContext: string;
  premium: boolean;
}

const cleanList = (value: unknown, max: number, maxLength: number) => Array.isArray(value)
  ? [...new Set(value.map(String).map(item => item.trim()).filter(Boolean))].filter(item => item.length <= maxLength).slice(0, max)
  : [];

export function countGrammarWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function validateGrammarRequest(value: unknown): { ok: true; request: GrammarCheckRequest } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') return { ok: false, error: 'A valid grammar request is required.' };
  const raw = value as Record<string, unknown>;
  const text = typeof raw.text === 'string' ? raw.text : '';
  if (!text.trim()) return { ok: false, error: 'Text is required.' };
  if (text.length > 100_000) return { ok: false, error: 'Text is too large.' };
  const language = typeof raw.language === 'string' ? raw.language : 'English';
  if (!SUPPORTED_GRAMMAR_LANGUAGES.has(language)) return { ok: false, error: 'This language is not supported by the current grammar engine.' };
  const categories = cleanList(raw.categories, 30, 40).filter(category => SUPPORTED_GRAMMAR_CATEGORIES.has(category));
  return { ok: true, request: {
    text,
    language,
    categories: categories.length ? categories : [...CORE_GRAMMAR_CATEGORIES],
    ignoredRules: cleanList(raw.ignoredRules, 100, 80),
    dictionary: cleanList(raw.dictionary, 500, 100),
    mode: raw.mode === 'realtime' ? 'realtime' : 'manual',
    requestId: typeof raw.requestId === 'string' ? raw.requestId.slice(0, 100) : '',
    documentVersion: Number.isFinite(Number(raw.documentVersion)) ? Math.max(0, Number(raw.documentVersion)) : 0,
    goals: {
      audience: typeof (raw.goals as any)?.audience === 'string' ? (raw.goals as any).audience.slice(0, 40) : 'General',
      formality: typeof (raw.goals as any)?.formality === 'string' ? (raw.goals as any).formality.slice(0, 40) : 'Neutral',
      intent: typeof (raw.goals as any)?.intent === 'string' ? (raw.goals as any).intent.slice(0, 40) : 'Inform',
      domain: typeof (raw.goals as any)?.domain === 'string' ? (raw.goals as any).domain.slice(0, 40) : 'General',
    },
  }};
}

export function buildGrammarPrompt(request: GrammarCheckRequest) {
  return `Analyze SOURCE_TEXT and return JSON only. Report specific, supportable issues; never invent an error or score. Offsets are zero-based UTF-16 positions in the exact source text. Replacements must fit the reported range. Each explanation must state what is wrong, why, the relevant writing principle, and one short generic example; acknowledge optional style choices.

LANGUAGE: ${request.language}
ENABLED CATEGORIES: ${request.categories.join(', ')}
IGNORED RULE IDS: ${request.ignoredRules.join(', ') || 'None'}
PERSONAL DICTIONARY: ${request.dictionary.join(' | ') || 'None'}
DOCUMENT GOALS: ${JSON.stringify(request.goals)}

JSON SCHEMA:
{"issues":[{"category":"Grammar","severity":"error","startOffset":0,"endOffset":4,"originalText":"text","replacements":["replacement"],"title":"Specific title","explanation":"Plain-language reason and principle","ruleId":"stable-rule-id","confidence":0.95,"sentenceContext":"containing sentence","premium":false}],"tone":{"label":"Neutral","evidence":["specific non-sensitive pattern"]}}

SOURCE_TEXT:
<source_text>${request.text}</source_text>`;
}

export function normalizeGrammarIssues(raw: unknown, text: string, premium: boolean): GrammarIssue[] {
  const items = Array.isArray((raw as any)?.issues) ? (raw as any).issues : [];
  const normalized: GrammarIssue[] = [];
  for (const item of items) {
    const startOffset = Number(item?.startOffset);
    const endOffset = Number(item?.endOffset);
    const category = String(item?.category || 'Grammar');
    if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) || startOffset < 0 || endOffset <= startOffset || endOffset > text.length) continue;
    if (!SUPPORTED_GRAMMAR_CATEGORIES.has(category)) continue;
    if (text.slice(startOffset, endOffset) !== String(item?.originalText || '')) continue;
    const isPremiumIssue = !CORE_GRAMMAR_CATEGORIES.has(category);
    if (isPremiumIssue && !premium) continue;
    const replacements = cleanList(item?.replacements, 5, 500);
    if (!replacements.length) continue;
    const candidate: GrammarIssue = {
      id: `${String(item?.ruleId || category).toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${startOffset}-${endOffset}`,
      category,
      severity: ['error', 'warning', 'suggestion'].includes(item?.severity) ? item.severity : 'suggestion',
      startOffset, endOffset, originalText: text.slice(startOffset, endOffset), replacements,
      title: String(item?.title || `${category} suggestion`).slice(0, 120),
      explanation: String(item?.explanation || 'Review this optional writing suggestion.').slice(0, 1000),
      ruleId: String(item?.ruleId || category).slice(0, 80),
      confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)),
      sentenceContext: String(item?.sentenceContext || '').slice(0, 1000), premium: isPremiumIssue,
    };
    if (normalized.some(issue => issue.startOffset === candidate.startOffset && issue.endOffset === candidate.endOffset && issue.replacements[0] === candidate.replacements[0])) continue;
    if (normalized.some(issue => candidate.startOffset < issue.endOffset && candidate.endOffset > issue.startOffset)) continue;
    normalized.push(candidate);
  }
  return normalized.sort((a, b) => a.startOffset - b.startOffset || b.confidence - a.confidence);
}

export function calculateWritingScores(text: string, issues: GrammarIssue[]) {
  const words = Math.max(1, countGrammarWords(text));
  const penalty = (categories: string[]) => issues.filter(issue => categories.includes(issue.category)).reduce((sum, issue) => sum + (issue.severity === 'error' ? 8 : issue.severity === 'warning' ? 5 : 2), 0);
  const normalized = (value: number) => Math.max(0, Math.min(100, Math.round(value - Math.max(0, issues.length - words / 8))));
  const grammar = normalized(100 - penalty(['Grammar', 'Capitalization', 'Sentence Structure', 'Agreement', 'Tense', 'Articles', 'Prepositions', 'Pronouns']));
  const spelling = normalized(100 - penalty(['Spelling']));
  const clarity = normalized(100 - penalty(['Clarity', 'Fluency', 'Conciseness', 'Wordiness', 'Redundancy']));
  const style = normalized(100 - penalty(['Style', 'Tone', 'Formality', 'Vocabulary', 'Repetition', 'Passive Voice']));
  return { overall: Math.round((grammar + spelling + clarity + style) / 4), grammar, spelling, clarity, readability: clarity, tone: style, conciseness: clarity, professionalism: style };
}
