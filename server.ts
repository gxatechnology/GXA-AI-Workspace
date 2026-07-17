import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '25mb' }));

// JSON File Database Configuration
const DB_FILE = path.join(__dirname, 'db.json');

function readDb() {
  let db: any = { users: {}, projects: {}, documents: {}, chats: {}, config: {}, usage: {} };
  const defaultConfig = {
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    chat_attachment_limit: 3,
    chat_attachment_size_mb: 5,
    chat_context_messages: 20,
    chat_premium_required: false,
    pdf_uploads_limit: 3,
    pdf_file_size_mb: 10,
    pdf_pages_limit: 50,
    pdf_chat_messages_limit: 5,
    pdf_persistence_entitlement: 'pro',
    ocr_pages_limit: 2,
    grammar_corrections_limit: 5,
    originality_daily_limit: 5,
    originality_word_limit: 1500,
    originality_paid_features: ['humanizer_advanced', 'plagiarism', 'insights'],
    grammar_word_limit: 500,
    grammar_advanced_entitlement: 'pro',
    writer_daily_limit: 5,
    writer_word_limit: 2000,
    writer_premium_templates: ['research-paper', 'literature-review', 'business-proposal', 'sop', 'lor', 'landing-page', 'youtube-script'],
    writer_version_entitlement: 'pro',
    writer_free_exports: ['txt'],
    writer_paid_exports: ['txt', 'md', 'html'],
    pricing_free: "₹0",
    pricing_pro: "₹99",
    pricing_pro_plus: "₹149",
    pricing_team: "Contact Sales",
    pricing_enterprise: "Custom Pricing",
    pricing_currency: "INR",
    feature_locks: {
      academic: true,
      creative: true,
      professional: true,
      custom: true
    },
    paraphraser_mode_entitlements: {
      standard: 'free', fluency: 'free', humanize: 'pro_plus', formal: 'pro_plus',
      academic: 'pro_plus', professional: 'pro_plus', business: 'pro_plus', creative: 'pro_plus',
      simple: 'pro_plus', expand: 'pro_plus', shorten: 'pro_plus', custom: 'pro_plus'
    },
    coupons: [
      { code: "GXA40", discount: "40%" },
      { code: "SAVE20", discount: "20%" }
    ],
    trial_days: 14,
    upgrade_message: "Join thousands of technical writers, marketers, and SaaS teams executing with GXA Technologies."
  };

  if (!fs.existsSync(DB_FILE)) {
    db = {
      users: {
        "tauqeerashraf250@gmail.com": {
          id: "tauqeerashraf250@gmail.com",
          username: "tauqeer",
          name: "Tauqeer Ashraf",
          email: "tauqeerashraf250@gmail.com",
          password: "password123",
          subscription: "free",
          role: "User"
        }
      },
      projects: {},
      documents: {},
      chats: {},
      config: defaultConfig,
      usage: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    db = { users: {}, projects: {}, documents: {}, chats: {}, config: defaultConfig, usage: {} };
  }

  // Backfill newly introduced configuration fields while preserving admin overrides.
  const mergedConfig = {
    ...defaultConfig,
    ...(db.config || {}),
    feature_locks: { ...defaultConfig.feature_locks, ...(db.config?.feature_locks || {}) },
    paraphraser_mode_entitlements: {
      ...defaultConfig.paraphraser_mode_entitlements,
      ...(db.config?.paraphraser_mode_entitlements || {})
    }
  };
  if (JSON.stringify(db.config || {}) !== JSON.stringify(mergedConfig)) {
    db.config = mergedConfig;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
  if (!db.usage) {
    db.usage = {};
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
  return db;
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helpers for auth check
const getUserId = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }
  const xUser = req.headers['x-user-id'];
  if (xUser) return (xUser as string).trim();
  return null;
};

// Authentication Endpoints
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const db = readDb();
  if (db.users[email]) {
    return res.status(400).json({ error: 'User already exists with this email address' });
  }
  const newUser = {
    id: email,
    username: email.split('@')[0],
    name,
    email,
    password,
    subscription: 'free',
    role: 'User'
  };
  db.users[email] = newUser;
  db.projects[email] = [];
  db.documents[email] = [];
  db.chats[email] = [];
  writeDb(db);
  res.json({ success: true, user: { id: email, name, email, subscription: 'free', role: 'User' } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const db = readDb();
  const user = db.users[email];
  if (!user || user.password !== password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription, role: user.role } });
});

app.get('/api/auth/profile', (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription, role: user.role } });
});

app.post('/api/auth/upgrade', (req, res) => {
  const userId = getUserId(req);
  const { plan } = req.body;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.subscription = plan;
  db.users[userId] = user;
  writeDb(db);
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription, role: user.role } });
});

// Admin Config & Usage Limits API Endpoints
app.get('/api/admin/config', (req, res) => {
  const db = readDb();
  res.json({ config: db.config });
});

app.post('/api/admin/config', (req, res) => {
  const db = readDb();
  db.config = { ...db.config, ...req.body };
  writeDb(db);
  res.json({ success: true, config: db.config });
});

app.get('/api/usage', (req, res) => {
  const userId = getUserId(req) || 'guest';
  const db = readDb();
  const today = new Date().toISOString().split('T')[0];
  if (!db.usage[userId]) {
    db.usage[userId] = {};
  }
  if (!db.usage[userId][today]) {
    db.usage[userId][today] = {
      paraphrases: 0,
      chats: 0,
      pdf_uploads: 0,
      ocr_pages: 0,
      grammar_corrections: 0
    };
    writeDb(db);
  }
  res.json({ usage: db.usage[userId][today] });
});

app.post('/api/usage/increment', (req, res) => {
  const userId = getUserId(req) || 'guest';
  const { type, count } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }
  const db = readDb();
  const today = new Date().toISOString().split('T')[0];
  if (!db.usage[userId]) {
    db.usage[userId] = {};
  }
  if (!db.usage[userId][today]) {
    db.usage[userId][today] = {
      paraphrases: 0,
      chats: 0,
      pdf_uploads: 0,
      ocr_pages: 0,
      grammar_corrections: 0
    };
  }
  const addValue = count !== undefined ? Number(count) : 1;
  if (db.usage[userId][today][type] !== undefined) {
    db.usage[userId][today][type] += addValue;
  } else {
    db.usage[userId][today][type] = addValue;
  }
  writeDb(db);
  res.json({ success: true, usage: db.usage[userId][today] });
});

// Projects API Endpoints
app.get('/api/projects', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  res.json({ projects: db.projects[userId] || [] });
});

app.post('/api/projects', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { name, type, toolUsed, previewText, size, status } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  const db = readDb();
  if (!db.projects[userId]) db.projects[userId] = [];
  const newProject = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    type,
    toolUsed: toolUsed || 'AI Suite',
    previewText: previewText || '',
    size: size || '1.0 KB',
    status: status || 'Draft',
    updatedAt: 'Just now'
  };
  db.projects[userId].unshift(newProject);
  writeDb(db);
  res.json({ success: true, project: newProject });
});

app.delete('/api/projects/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const db = readDb();
  if (db.projects[userId]) {
    db.projects[userId] = db.projects[userId].filter((p: any) => p.id !== id);
    writeDb(db);
  }
  res.json({ success: true });
});

// Documents / PDF API Endpoints
app.get('/api/documents', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  res.json({ documents: db.documents[userId] || [] });
});

app.post('/api/documents', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { name, pages, size, extractedSnippet } = req.body;
  if (!name) return res.status(400).json({ error: 'Document name is required' });
  const db = readDb();
  if (!db.documents[userId]) db.documents[userId] = [];
  const newDoc = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    pages: pages || 5,
    size: size || '1.2 MB',
    extractedSnippet: extractedSnippet || 'This is the document content extracted dynamically.'
  };
  db.documents[userId].unshift(newDoc);
  writeDb(db);
  res.json({ success: true, document: newDoc });
});

app.delete('/api/documents/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const db = readDb();
  if (db.documents[userId]) {
    db.documents[userId] = db.documents[userId].filter((d: any) => d.id !== id);
    writeDb(db);
  }
  res.json({ success: true });
});

// Conversation history is stored only for authenticated, non-temporary chats.
app.get('/api/chats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  const chats = (db.chats[userId] || []).filter((chat: any) => chat && chat.id && Array.isArray(chat.messages));
  res.json({ chats });
});

app.post('/api/chats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { conversation } = req.body;
  if (!conversation?.id || !Array.isArray(conversation.messages)) return res.status(400).json({ error: 'A valid conversation is required' });
  const db = readDb();
  if (!db.chats[userId]) db.chats[userId] = [];
  const safeConversation = {
    id: String(conversation.id),
    title: String(conversation.title || 'New chat').slice(0, 100),
    projectId: conversation.projectId ? String(conversation.projectId) : undefined,
    pinned: Boolean(conversation.pinned),
    createdAt: String(conversation.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
    messages: conversation.messages.slice(-100).map((message: any) => ({
      id: String(message.id),
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').slice(0, 100000),
      createdAt: String(message.createdAt || new Date().toISOString()),
      status: String(message.status || 'complete'),
      attachments: Array.isArray(message.attachments) ? message.attachments.map((file: any) => ({ name: String(file.name), type: String(file.type), size: Number(file.size) })) : []
    }))
  };
  const index = db.chats[userId].findIndex((chat: any) => chat.id === safeConversation.id);
  if (index >= 0) db.chats[userId][index] = safeConversation;
  else db.chats[userId].unshift(safeConversation);
  writeDb(db);
  res.json({ success: true, conversation: safeConversation });
});

app.delete('/api/chats/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  db.chats[userId] = (db.chats[userId] || []).filter((chat: any) => chat.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Initialize the Gemini client lazily to avoid crashing on startup if the API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please check Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const isPaidUser = (db: any, userId: string) => ['pro', 'pro_plus', 'premium', 'team', 'enterprise'].includes(String(db.users?.[userId]?.subscription || '').toLowerCase());
const parseModelJson = (text: string) => JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

app.get('/api/originality/reports', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to view saved reports.' });
  const db = readDb();
  res.json({ reports: db.originalityReports?.[userId] || [] });
});

app.post('/api/originality/reports', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to save reports.' });
  const { type, input, output } = req.body || {};
  if (!type || !input || output === undefined) return res.status(400).json({ error: 'A completed report is required.' });
  const db = readDb();
  if (!db.originalityReports) db.originalityReports = {};
  if (!db.originalityReports[userId]) db.originalityReports[userId] = [];
  const report = { id: Math.random().toString(36).slice(2, 10), type: String(type), input: String(input).slice(0, 50000), output, createdAt: new Date().toISOString() };
  db.originalityReports[userId].unshift(report);
  db.originalityReports[userId] = db.originalityReports[userId].slice(0, 100);
  writeDb(db);
  res.json({ success: true, report });
});

app.post('/api/originality/analyze', async (req, res) => {
  const userId = getUserId(req) || 'guest';
  const { action, text, mode = 'Standard' } = req.body || {};
  const allowed = ['detect', 'humanize', 'plagiarism', 'insights'];
  if (!allowed.includes(action)) return res.status(400).json({ error: 'Unsupported originality operation.' });
  const input = String(text || '').trim();
  if (!input) return res.status(400).json({ error: 'Text is required.' });
  const db = readDb();
  const words = input.split(/\s+/).filter(Boolean).length;
  if (words > Number(db.config.originality_word_limit || 1500)) return res.status(413).json({ code: 'word_limit', error: 'The text exceeds the configured word limit.' });
  const paid = isPaidUser(db, userId);
  const paidFeatures = Array.isArray(db.config.originality_paid_features) ? db.config.originality_paid_features : [];
  const feature = action === 'plagiarism' ? 'plagiarism' : action === 'insights' ? 'insights' : action === 'humanize' && mode !== 'Standard' ? 'humanizer_advanced' : null;
  if (feature && paidFeatures.includes(feature) && !paid) return res.status(403).json({ code: 'premium_required', error: 'This feature requires an upgraded plan.' });
  const today = new Date().toISOString().slice(0, 10);
  if (!db.usage[userId]) db.usage[userId] = {};
  if (!db.usage[userId][today]) db.usage[userId][today] = { paraphrases: 0, chats: 0, pdf_uploads: 0, ocr_pages: 0, grammar_corrections: 0, originality_checks: 0 };
  if (!paid && Number(db.usage[userId][today].originality_checks || 0) >= Number(db.config.originality_daily_limit || 5)) return res.status(429).json({ code: 'usage_limit', error: 'Your daily originality limit has been reached.' });

  try {
    let result: any;
    if (action === 'plagiarism') {
      const providerUrl = process.env.PLAGIARISM_API_URL;
      const providerKey = process.env.PLAGIARISM_API_KEY;
      if (!providerUrl || !providerKey) return res.status(503).json({ code: 'service_unavailable', error: 'Plagiarism search is not configured. No sources or matches were generated.' });
      const provider = await fetch(providerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerKey}` }, body: JSON.stringify({ text: input }) });
      if (!provider.ok) return res.status(503).json({ code: 'service_unavailable', error: 'The plagiarism source service is currently unavailable.' });
      const data: any = await provider.json();
      const matches = Array.isArray(data.matches) ? data.matches.filter((match: any) => match?.url && match?.title).map((match: any) => ({ title: String(match.title), url: String(match.url), similarity: Math.max(0, Math.min(100, Number(match.similarity) || 0)), excerpt: String(match.excerpt || '').slice(0, 500) })) : [];
      result = { matches, checked: true, note: matches.length ? 'Matches are reported by the configured source provider and require manual review.' : 'The configured provider returned no matches. This does not prove originality.' };
    } else if (action === 'humanize') {
      const response = await getGeminiClient().models.generateContent({ model: 'gemini-2.5-flash', contents: input, config: { systemInstruction: `Rewrite in ${mode} mode. Preserve the original meaning, claims, names, numbers, quotations, and uncertainty. Do not add facts, examples, citations, or sources. Improve natural flow and clarity without promising detector evasion.` } });
      result = { text: response.text || '' };
    } else if (action === 'detect') {
      const response = await getGeminiClient().models.generateContent({ model: 'gemini-2.5-flash', contents: input, config: { responseMimeType: 'application/json', systemInstruction: 'Analyze stylistic signals probabilistically. Return JSON: {"probability": number 0-100, "confidence":"low"|"medium"|"high", "indicators": string[], "limitations": string}. Never claim authorship as fact. Explain that human and AI writing overlap and results are not proof.' } });
      const parsed = parseModelJson(response.text || '{}');
      if (!Number.isFinite(Number(parsed.probability))) throw new Error('The detector returned an invalid probability.');
      result = { probability: Math.max(0, Math.min(100, Number(parsed.probability))), confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'low', indicators: Array.isArray(parsed.indicators) ? parsed.indicators.slice(0, 8).map(String) : [], limitations: String(parsed.limitations || 'This estimate is probabilistic and cannot establish who or what wrote the text.') };
    } else {
      const response = await getGeminiClient().models.generateContent({ model: 'gemini-2.5-flash', contents: input, config: { responseMimeType: 'application/json', systemInstruction: 'Return JSON writing analysis: {"readability":"...","tone":"...","clarity":number 0-100,"sentenceVariety":number 0-100,"observations":string[]}. Base observations only on supplied text. Do not infer author identity or invent facts.' } });
      const parsed = parseModelJson(response.text || '{}');
      if (!Number.isFinite(Number(parsed.clarity)) || !Number.isFinite(Number(parsed.sentenceVariety))) throw new Error('The insights service returned invalid metrics.');
      result = { readability: String(parsed.readability || 'Unavailable'), tone: String(parsed.tone || 'Unavailable'), clarity: Math.max(0, Math.min(100, Number(parsed.clarity))), sentenceVariety: Math.max(0, Math.min(100, Number(parsed.sentenceVariety))), observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 8).map(String) : [] };
    }
    db.usage[userId][today].originality_checks = (db.usage[userId][today].originality_checks || 0) + 1;
    writeDb(db);
    res.json({ result, usage: db.usage[userId][today] });
  } catch (error: any) {
    console.error('Originality provider error:', error?.message || error);
    const status = Number(error?.status || 500);
    res.status(status === 429 ? 429 : 502).json({ code: status === 429 ? 'rate_limit' : 'provider_failure', error: status === 429 ? 'The provider is rate limited. Try again shortly.' : 'The analysis service is currently unavailable.' });
  }
});

const planRank = (plan: string) => ({ free: 0, pro: 1, pro_plus: 2, team: 3, enterprise: 4 }[String(plan || 'free').toLowerCase()] ?? 0);

app.get('/api/pdf-state/:fingerprint', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to restore PDF workspace data.' });
  const db = readDb();
  const required = String(db.config.pdf_persistence_entitlement || 'pro');
  if (planRank(db.users[userId]?.subscription) < planRank(required)) return res.status(403).json({ code: 'premium_required', error: 'Your plan does not include saved PDF workspaces.' });
  res.json({ state: db.pdfStates?.[userId]?.[req.params.fingerprint] || null });
});

app.put('/api/pdf-state/:fingerprint', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to save PDF workspace data.' });
  const db = readDb();
  const required = String(db.config.pdf_persistence_entitlement || 'pro');
  if (planRank(db.users[userId]?.subscription) < planRank(required)) return res.status(403).json({ code: 'premium_required', error: 'Your plan does not include saved PDF workspaces.' });
  if (!db.pdfStates) db.pdfStates = {};
  if (!db.pdfStates[userId]) db.pdfStates[userId] = {};
  const { page = 1, bookmarks = [], annotations = [], chat = [] } = req.body || {};
  db.pdfStates[userId][req.params.fingerprint] = {
    page: Math.max(1, Number(page) || 1),
    bookmarks: Array.isArray(bookmarks) ? bookmarks.slice(0, 500).map(Number) : [],
    annotations: Array.isArray(annotations) ? annotations.slice(0, 500) : [],
    chat: Array.isArray(chat) ? chat.slice(-100) : [],
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  res.json({ success: true });
});

app.post('/api/pdf/register-upload', (req, res) => {
  const userId = getUserId(req) || 'guest';
  const { name, type, size, pages } = req.body || {};
  const db = readDb();
  const paidPlan = planRank(db.users[userId]?.subscription) >= planRank('pro');
  if (!String(name || '').toLowerCase().endsWith('.pdf') || type !== 'application/pdf') return res.status(415).json({ code: 'invalid_file', error: 'A valid PDF file is required.' });
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) return res.status(400).json({ code: 'empty_file', error: 'The selected PDF is empty.' });
  if (!paidPlan && Number(size) > Number(db.config.pdf_file_size_mb || 10) * 1024 * 1024) return res.status(413).json({ code: 'file_size', error: 'The PDF exceeds your plan file-size limit.' });
  if (!paidPlan && Number(pages) > Number(db.config.pdf_pages_limit || 50)) return res.status(413).json({ code: 'page_limit', error: 'The PDF exceeds your plan page limit.' });
  const today = new Date().toISOString().slice(0, 10);
  if (!db.usage[userId]) db.usage[userId] = {};
  if (!db.usage[userId][today]) db.usage[userId][today] = { paraphrases: 0, chats: 0, pdf_uploads: 0, pdf_chats: 0, ocr_pages: 0, grammar_corrections: 0 };
  if (!paidPlan && Number(db.usage[userId][today].pdf_uploads || 0) >= Number(db.config.pdf_uploads_limit || 3)) return res.status(429).json({ code: 'upload_limit', error: 'Your daily PDF upload limit has been reached.' });
  db.usage[userId][today].pdf_uploads = (db.usage[userId][today].pdf_uploads || 0) + 1;
  writeDb(db);
  res.json({ success: true, usage: db.usage[userId][today] });
});

app.post('/api/pdf/analyze', async (req, res) => {
  const startedAt = Date.now();
  const userId = getUserId(req) || 'guest';
  try {
    const { action, dataUrl, pageText = '', prompt = '', pageCount = 1, targetLanguage = 'English' } = req.body || {};
    const allowedActions = ['summary', 'chat', 'ocr', 'tables', 'translate'];
    if (!allowedActions.includes(action)) return res.status(400).json({ error: 'Unsupported PDF operation.' });
    const match = String(dataUrl || '').match(/^data:application\/pdf;base64,(.+)$/s);
    if (!match) return res.status(415).json({ error: 'A valid PDF payload is required.' });
    const db = readDb();
    const paidPlan = planRank(db.users[userId]?.subscription) >= planRank('pro');
    const maxBytes = Number(db.config.pdf_file_size_mb || 10) * 1024 * 1024;
    if (Math.ceil(match[1].length * 0.75) > maxBytes) return res.status(413).json({ code: 'file_size', error: 'The PDF exceeds the configured file-size limit.' });
    if (!paidPlan && Number(pageCount) > Number(db.config.pdf_pages_limit || 50)) return res.status(413).json({ code: 'page_limit', error: 'The PDF exceeds the configured page limit.' });
    const today = new Date().toISOString().slice(0, 10);
    const usage = db.usage?.[userId]?.[today] || {};
    if (!paidPlan && action === 'chat' && Number(usage.pdf_chats || 0) >= Number(db.config.pdf_chat_messages_limit || 5)) return res.status(429).json({ code: 'usage_limit', error: 'Your PDF chat limit has been reached.' });
    if (!paidPlan && action === 'ocr' && Number(usage.ocr_pages || 0) + Number(pageCount) > Number(db.config.ocr_pages_limit || 2)) return res.status(429).json({ code: 'ocr_limit', error: 'This OCR request exceeds your remaining page allowance.' });
    const instructions: Record<string, string> = {
      summary: 'Summarize this PDF accurately. Use headings and bullets. Cite supporting pages as [Page N] only when the supplied page text establishes the page.',
      chat: `Answer this question using only the PDF: ${String(prompt).slice(0, 4000)}. Cite every factual answer with [Page N]. Say when the document does not contain the answer.`,
      ocr: 'Transcribe the PDF pages faithfully. Preserve headings, lists, and tables. Prefix each page with [Page N]. Do not invent unreadable text.',
      tables: 'Extract tables from this PDF as Markdown tables. Label each with its source page [Page N]. If there are no tables, state that clearly.',
      translate: `Translate the PDF content into ${String(targetLanguage).slice(0, 60)}. Preserve structure and page labels [Page N].`
    };
    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${instructions[action]}\n\nExtracted page text where available:\n${String(pageText).slice(0, 300000)}` }, { inlineData: { mimeType: 'application/pdf', data: match[1] } }] }]
    });
    if (!db.usage[userId]) db.usage[userId] = {};
    if (!db.usage[userId][today]) db.usage[userId][today] = { paraphrases: 0, chats: 0, pdf_uploads: 0, pdf_chats: 0, ocr_pages: 0, grammar_corrections: 0 };
    if (action === 'chat') db.usage[userId][today].pdf_chats = (db.usage[userId][today].pdf_chats || 0) + 1;
    if (action === 'ocr') db.usage[userId][today].ocr_pages = (db.usage[userId][today].ocr_pages || 0) + Number(pageCount);
    if (!db.pdf_requests) db.pdf_requests = [];
    db.pdf_requests.unshift({ userId, action, status: 'complete', latencyMs: Date.now() - startedAt, createdAt: new Date().toISOString() });
    db.pdf_requests = db.pdf_requests.slice(0, 1000);
    writeDb(db);
    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('PDF analysis error:', error?.message || error);
    const status = Number(error?.status || 500);
    res.status(status === 429 ? 429 : 502).json({ code: status === 429 ? 'rate_limit' : 'provider_failure', error: status === 429 ? 'The AI provider is rate limited. Try again shortly.' : 'The PDF provider could not complete this request.' });
  }
});

const writerPlanRank = (plan: string) => ({ free: 0, pro: 1, pro_plus: 2, premium: 2, team: 3, enterprise: 4 }[String(plan || 'free').toLowerCase()] ?? 0);

app.get('/api/writer/documents', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to load writer documents.' });
  const db = readDb();
  res.json({ documents: db.writerDocuments?.[userId] || [] });
});

app.put('/api/writer/documents/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to save writer documents.' });
  const { title = 'Untitled', content = '', templateId = 'blog', createVersion = false } = req.body || {};
  const db = readDb();
  if (!db.writerDocuments) db.writerDocuments = {};
  if (!db.writerDocuments[userId]) db.writerDocuments[userId] = [];
  const index = db.writerDocuments[userId].findIndex((doc: any) => doc.id === req.params.id);
  const existing = index >= 0 ? db.writerDocuments[userId][index] : null;
  const required = String(db.config.writer_version_entitlement || 'pro');
  const mayVersion = writerPlanRank(db.users[userId]?.subscription) >= writerPlanRank(required);
  const versions = Array.isArray(existing?.versions) ? existing.versions : [];
  if (createVersion && mayVersion && existing?.content && existing.content !== content) versions.unshift({ id: Math.random().toString(36).slice(2, 10), title: existing.title, content: existing.content, createdAt: new Date().toISOString() });
  const document = { id: req.params.id, title: String(title).slice(0, 150), content: String(content).slice(0, 250000), templateId: String(templateId), versions: versions.slice(0, 50), updatedAt: new Date().toISOString() };
  if (index >= 0) db.writerDocuments[userId][index] = document; else db.writerDocuments[userId].unshift(document);
  writeDb(db);
  res.json({ success: true, document, versionCreated: Boolean(createVersion && mayVersion) });
});

app.post('/api/writer/stream', async (req, res) => {
  const userId = getUserId(req) || 'guest';
  const { action = 'generate', prompt = '', content = '', selectedText = '', templateId = 'blog', templateName = 'Blog', options = {} } = req.body || {};
  const allowedActions = ['generate', 'continue', 'rewrite', 'improve', 'expand', 'shorten', 'translate'];
  if (!allowedActions.includes(action)) return res.status(400).json({ error: 'Unsupported writer action.' });
  const db = readDb();
  const userPlan = String(db.users[userId]?.subscription || 'free').toLowerCase();
  const paid = writerPlanRank(userPlan) >= writerPlanRank('pro');
  const premiumTemplates = Array.isArray(db.config.writer_premium_templates) ? db.config.writer_premium_templates : [];
  if (!paid && premiumTemplates.includes(templateId)) return res.status(403).json({ code: 'premium_template', error: 'This template requires an upgraded plan.' });
  const source = String(selectedText || content || prompt).trim();
  const words = source ? source.split(/\s+/).length : 0;
  if (!source) return res.status(400).json({ error: 'Add instructions or editor text first.' });
  if (words > Number(db.config.writer_word_limit || 2000)) return res.status(413).json({ code: 'word_limit', error: 'The source text exceeds the configured word limit.' });
  const today = new Date().toISOString().slice(0, 10);
  if (!db.usage[userId]) db.usage[userId] = {};
  if (!db.usage[userId][today]) db.usage[userId][today] = { paraphrases: 0, chats: 0, pdf_uploads: 0, ocr_pages: 0, grammar_corrections: 0, writer_generations: 0 };
  if (!paid && Number(db.usage[userId][today].writer_generations || 0) >= Number(db.config.writer_daily_limit || 5)) return res.status(429).json({ code: 'usage_limit', error: 'Your daily writer limit has been reached.' });

  const actionInstruction: Record<string, string> = {
    generate: `Create a ${templateName} from these instructions: ${prompt || source}`,
    continue: `Continue this draft naturally from its ending:\n${content}`,
    rewrite: `Rewrite the selected passage while preserving meaning:\n${selectedText || content}`,
    improve: `Improve clarity, flow, grammar, and impact without adding claims:\n${selectedText || content}`,
    expand: `Expand this passage with useful explanation, but do not invent facts, sources, quotes, or statistics:\n${selectedText || content}`,
    shorten: `Shorten this passage while preserving its important meaning:\n${selectedText || content}`,
    translate: `Translate this passage into ${String(options.language || 'English')}. Preserve meaning, names, numbers, formatting, and uncertainty:\n${selectedText || content}`
  };
  const systemInstruction = `You are the GXA AI Writer Studio. Write for purpose "${String(options.purpose || 'Inform')}" and audience "${String(options.audience || 'General')}" in a ${String(options.tone || 'Professional')} tone, ${String(options.language || 'English')} language, ${String(options.length || 'Medium')} length, and ${String(options.readingLevel || 'General')} reading level. Keywords: ${String(options.keywords || 'none')}. Never fabricate facts, research findings, sources, citations, testimonials, qualifications, or personal experience. If necessary information is missing, use clearly marked placeholders. Return only the requested draft.`;
  let closed = false, output = '';
  res.on('close', () => { if (!res.writableEnded) closed = true; });
  try {
    res.status(200); res.setHeader('Content-Type', 'text/event-stream; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
    const stream = await getGeminiClient().models.generateContentStream({ model: 'gemini-2.5-flash', contents: actionInstruction[action], config: { systemInstruction } });
    for await (const chunk of stream) { if (closed) break; const delta = chunk.text || ''; output += delta; res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`); }
    if (!closed) { res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`); res.end(); }
    db.usage[userId][today].writer_generations = (db.usage[userId][today].writer_generations || 0) + 1;
    if (!db.writerRequests) db.writerRequests = [];
    db.writerRequests.unshift({ userId, action, templateId, status: closed ? 'interrupted' : 'complete', outputCharacters: output.length, createdAt: new Date().toISOString() });
    db.writerRequests = db.writerRequests.slice(0, 1000); writeDb(db);
  } catch (error: any) {
    console.error('Writer provider error:', error?.message || error);
    const message = /429|rate limit|quota/i.test(String(error?.message || '')) ? 'The provider is rate limited. Try again shortly.' : 'The writing provider is currently unavailable.';
    if (res.headersSent) { if (!closed) { res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`); res.end(); } } else res.status(502).json({ error: message });
  }
});

// Helper to call Gemini with retry and fallback
async function generateWithRetryAndFallback(prompt: string, config: any) {
  const ai = getGeminiClient();
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempt = 0;
    const maxAttempts = 3;
    let delay = 800;

    while (attempt < maxAttempts) {
      try {
        console.log(`Calling Gemini API (model: ${model}, attempt: ${attempt + 1}/${maxAttempts})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        attempt++;
        console.warn(`Gemini API call failed with model ${model} (attempt ${attempt}/${maxAttempts}):`, err.message || err);
        
        // Only retry if it is a 503, rate limit (429), or standard transient network error
        const errCode = err.status || err.statusCode || (err.error && err.error.code);
        const errMessage = err.message || (typeof err === 'string' ? err : '');
        const isTransient = errCode === 503 || 
                            errCode === 429 || 
                            /503|429|UNAVAILABLE|high demand|rate limit/i.test(errMessage);

        if (!isTransient || attempt >= maxAttempts) {
          break; // break the retry loop for this model, fallback to next model
        }

        // Wait with exponential backoff before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  throw lastError || new Error('All attempts to generate content with Gemini models failed');
}

function classifyProviderError(error: any) {
  const status = Number(error?.status || error?.statusCode || error?.error?.code || 500);
  const message = String(error?.message || 'The AI provider is unavailable.');
  if (status === 429 || /rate limit|quota/i.test(message)) return { status: 429, code: 'rate_limit', message: 'The AI service is busy. Please try again shortly.' };
  if (/timeout|timed out/i.test(message)) return { status: 504, code: 'timeout', message: 'The request timed out. Your message was preserved.' };
  return { status: status >= 400 && status < 600 ? status : 502, code: 'provider_failure', message: 'The AI provider could not complete this request.' };
}

async function streamFromProvider(messages: any[], attachments: any[], systemInstruction: string) {
  const ai = getGeminiClient();
  const contents: any[] = messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content || '') }]
  }));
  const lastUser = [...contents].reverse().find(message => message.role === 'user');
  for (const file of attachments) {
    const match = String(file.content || '').match(/^data:([^;]+);base64,(.+)$/s);
    if (match && lastUser) lastUser.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    else if (file.content && lastUser) lastUser.parts.push({ text: `\nAttachment ${file.name}:\n${String(file.content).slice(0, 100000)}` });
  }
  return ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: { systemInstruction }
  });
}

app.post('/api/chat/stream', async (req, res) => {
  const startedAt = Date.now();
  const requestId = Math.random().toString(36).slice(2, 12);
  const userId = getUserId(req) || 'guest';
  let output = '';
  let status = 'started';
  let closed = false;
  res.on('close', () => { if (!res.writableEnded) closed = true; });

  const recordRequest = (requestStatus: string, errorCode?: string) => {
    const db = readDb();
    if (!db.chat_requests) db.chat_requests = [];
    db.chat_requests.unshift({
      id: requestId,
      userId,
      status: requestStatus,
      tokenCount: Math.ceil(output.length / 4),
      latencyMs: Date.now() - startedAt,
      errorCode,
      createdAt: new Date().toISOString()
    });
    db.chat_requests = db.chat_requests.slice(0, 1000);
    writeDb(db);
  };

  try {
    const { messages, attachments = [] } = req.body;
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'At least one message is required.' });
    const db = readDb();
    const config = db.config || {};
    const today = new Date().toISOString().split('T')[0];
    const currentUsage = db.usage?.[userId]?.[today]?.chats || 0;
    const user = userId === 'guest' ? null : db.users[userId];
    const premium = ['pro', 'pro_plus', 'premium', 'team', 'enterprise'].includes(String(user?.subscription || '').toLowerCase());
    if (!premium && currentUsage >= Number(config.ai_chats_limit || 5)) return res.status(429).json({ code: 'usage_limit', error: 'Your daily chat limit has been reached.' });
    if (config.chat_premium_required && !premium) return res.status(403).json({ code: 'premium_required', error: 'AI Chat requires an upgraded plan.' });
    if (attachments.length > Number(config.chat_attachment_limit || 3)) return res.status(413).json({ code: 'attachment_limit', error: 'Too many attachments.' });
    const maxBytes = Number(config.chat_attachment_size_mb || 5) * 1024 * 1024;
    const allowedTypes = /^(text\/|image\/(png|jpeg|webp|gif)$|application\/(pdf|json)$)/;
    for (const file of attachments) {
      if (!allowedTypes.test(String(file.type || ''))) return res.status(415).json({ code: 'unsupported_file', error: `Unsupported file: ${String(file.name || 'attachment')}` });
      if (Number(file.size || 0) > maxBytes) return res.status(413).json({ code: 'attachment_size', error: `${String(file.name)} exceeds the configured file limit.` });
    }

    const contextLimit = Number(config.chat_context_messages || 20);
    const safeMessages = messages.slice(-contextLimit).map((message: any) => ({ role: message.role, content: String(message.content || '').slice(0, 100000) }));
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: 'meta', requestId })}\n\n`);
    const stream = await streamFromProvider(safeMessages, attachments, 'You are GXA AI Workspace. Give accurate, concise, helpful answers. Use Markdown for headings, lists, tables, and fenced code when useful. Never claim to have read an attachment unless its contents are present.');
    for await (const chunk of stream) {
      if (closed) { status = 'interrupted'; break; }
      const text = chunk.text || '';
      output += text;
      res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
    }
    if (!closed) {
      status = 'complete';
      res.write(`data: ${JSON.stringify({ type: 'done', tokenCount: Math.ceil(output.length / 4), latencyMs: Date.now() - startedAt })}\n\n`);
      res.end();
    }
    if (!db.usage[userId]) db.usage[userId] = {};
    if (!db.usage[userId][today]) db.usage[userId][today] = { paraphrases: 0, chats: 0, pdf_uploads: 0, ocr_pages: 0, grammar_corrections: 0 };
    db.usage[userId][today].chats = (db.usage[userId][today].chats || 0) + 1;
    writeDb(db);
    recordRequest(status);
  } catch (error: any) {
    const mapped = classifyProviderError(error);
    status = mapped.code;
    if (res.headersSent) {
      if (!closed) { res.write(`data: ${JSON.stringify({ type: 'error', code: mapped.code, message: mapped.message })}\n\n`); res.end(); }
    } else res.status(mapped.status).json({ code: mapped.code, error: mapped.message });
    recordRequest(status, mapped.code);
  }
});

// REST endpoint for Gemini API calls
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction, responseMimeType } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }

    const response = await generateWithRetryAndFallback(prompt, config);

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini proxy error:', error);
    res.status(500).json({ error: error.message || 'Error generating content from Gemini API' });
  }
});

// Serve frontend
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, let Vite handle the requests
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const html = await vite.transformIndexHtml(url, `<!doctype html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>GXA AI Workspace</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
