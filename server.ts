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
app.use(express.json({ limit: '20mb' }));

// JSON File Database Configuration
const DB_FILE = path.join(__dirname, 'db.json');

function readDb() {
  let db: any = { users: {}, projects: {}, documents: {}, chats: {}, config: {}, usage: {} };
  const defaultConfig = {
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    pdf_uploads_limit: 3,
    pdf_file_size_mb: 10,
    pdf_pages_limit: 50,
    pdf_chat_messages_limit: 5,
    pdf_persistence_entitlement: 'pro',
    ocr_pages_limit: 2,
    grammar_corrections_limit: 5,
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

  // Backfill if needed
  const mergedConfig = { ...defaultConfig, ...(db.config || {}), feature_locks: { ...defaultConfig.feature_locks, ...(db.config?.feature_locks || {}) } };
  if (JSON.stringify(mergedConfig) !== JSON.stringify(db.config)) {
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
