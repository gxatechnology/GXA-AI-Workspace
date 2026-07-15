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
app.use(express.json());

// JSON File Database Configuration
const DB_FILE = path.join(__dirname, 'db.json');

function readDb() {
  let db: any = { users: {}, projects: {}, documents: {}, chats: {}, config: {}, usage: {} };
  const defaultConfig = {
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    pdf_uploads_limit: 3,
    ocr_pages_limit: 2,
    grammar_corrections_limit: 5,
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

// Chat History API Endpoints
app.get('/api/chats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  res.json({ chats: db.chats[userId] || [] });
});

app.post('/api/chats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { role, content } = req.body;
  if (!role || !content) return res.status(400).json({ error: 'Role and content are required' });
  const db = readDb();
  if (!db.chats[userId]) db.chats[userId] = [];
  const newMsg = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  db.chats[userId].push(newMsg);
  writeDb(db);
  res.json({ success: true, message: newMsg });
});

app.delete('/api/chats', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb();
  db.chats[userId] = [];
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
