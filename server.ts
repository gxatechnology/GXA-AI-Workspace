import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { verifyRazorpaySignature } from './server/billingSecurity';

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
    pricing_free: "₹0",
    pricing_pro: "₹99",
    pricing_pro_plus: "₹149",
    pricing_team: "Contact Sales",
    pricing_enterprise: "Custom Pricing",
    pricing_currency: "INR",
    plans: {
      free: { name: 'Free', monthlyPrice: 0, billing: 'monthly', features: ['Standard Paraphraser', 'Fluency Mode', 'Basic Grammar Checker', 'Limited AI Chat', 'Limited AI Writer', 'Limited AI Humanizer', 'Limited AI Detector', 'Basic Summarizer', 'Basic Translator'], limits: { words: 500, requests: 5, pdfUploads: 1, pdfSizeMb: 10, pdfPages: 20, ocrPages: 2, storageMb: 100, historyDays: 0 } },
      pro: { name: 'Pro', monthlyPrice: 99, billing: 'monthly', features: ['Everything in Free', 'Unlimited Standard usage', 'Better Grammar suggestions', 'PDF Chat', 'Projects', 'History', 'Saved outputs', 'Cloud Sync', 'Faster processing'], limits: { words: 2000, requests: 100, pdfUploads: 10, pdfSizeMb: 25, pdfPages: 100, ocrPages: 25, storageMb: 2048, historyDays: 30 } },
      pro_plus: { name: 'Pro Plus', monthlyPrice: 149, billing: 'monthly', features: ['Everything in Pro', 'Premium writing modes', 'OCR', 'Plagiarism Checker', 'Citation Generator', 'Unlimited AI Humanizer', 'Advanced AI Detector', 'Larger PDF uploads', 'Longer history'], limits: { words: 10000, requests: 500, pdfUploads: 50, pdfSizeMb: 100, pdfPages: 500, ocrPages: 200, storageMb: 10240, historyDays: 365 } },
      team: { name: 'Team', monthlyPrice: null, priceLabel: 'Contact Sales', billing: 'contact', features: ['Everything in Pro Plus', 'Team workspaces', 'Centralized billing', 'Shared projects'], limits: { words: -1, requests: -1, pdfUploads: -1, pdfSizeMb: 250, pdfPages: 1000, ocrPages: -1, storageMb: 51200, historyDays: 365 } },
      enterprise: { name: 'Enterprise', monthlyPrice: null, priceLabel: 'Custom Pricing', billing: 'custom', features: ['Everything in Team', 'Custom limits', 'Priority support', 'Enterprise controls'], limits: { words: -1, requests: -1, pdfUploads: -1, pdfSizeMb: -1, pdfPages: -1, ocrPages: -1, storageMb: -1, historyDays: -1 } }
    },
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
    promotions: [],
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
  const mergedConfig = { ...defaultConfig, ...(db.config || {}), plans: { ...defaultConfig.plans, ...(db.config?.plans || {}) }, feature_locks: { ...defaultConfig.feature_locks, ...(db.config?.feature_locks || {}) } };
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
  res.status(410).json({ error: 'Direct upgrades are disabled. Create and verify a billing order.' });
});

app.get('/api/billing/subscription', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDb(); const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ subscription: user.subscription || 'free', billing: user.billing || null, plan: db.config.plans?.[user.subscription || 'free'] || db.config.plans?.free });
});

app.post('/api/billing/orders', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ code: 'authentication_required', error: 'Sign in before payment.' });
  const { planId, couponCode = '' } = req.body || {};
  if (!['pro', 'pro_plus'].includes(planId)) return res.status(400).json({ error: 'Select a payable plan.' });
  const db = readDb(); const plan = db.config.plans?.[planId];
  if (!plan || !Number.isFinite(Number(plan.monthlyPrice))) return res.status(400).json({ error: 'The selected plan is not available.' });
  let amount = Number(plan.monthlyPrice);
  const coupon = (db.config.coupons || []).find((item: any) => String(item.code).toLowerCase() === String(couponCode).trim().toLowerCase());
  if (coupon) { const percentage = Math.max(0, Math.min(90, Number(String(coupon.discount).replace(/[^0-9.]/g, '')) || 0)); amount = Math.max(1, Math.round(amount * (1 - percentage / 100))); }
  const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ code: 'payment_unavailable', error: 'Payment service is not configured.' });
  try {
    const provider = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` }, body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: `gxa_${Date.now()}`, notes: { userId, planId } }) });
    const order: any = await provider.json();
    if (!provider.ok || !order.id) return res.status(502).json({ code: 'order_failed', error: order.error?.description || 'Payment order creation failed.' });
    if (!db.billingOrders) db.billingOrders = {};
    db.billingOrders[order.id] = { userId, planId, amountPaise: amount * 100, currency: 'INR', status: 'created', couponCode: coupon?.code || null, createdAt: new Date().toISOString() };
    writeDb(db);
    res.json({ orderId: order.id, amount: amount * 100, currency: 'INR', keyId, planName: plan.name });
  } catch { res.status(502).json({ code: 'order_failed', error: 'Could not connect to the payment service.' }); }
});

app.post('/api/billing/verify', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return res.status(503).json({ code: 'verification_unavailable', error: 'Payment verification is not configured.' });
  const db = readDb(); const stored = db.billingOrders?.[orderId];
  if (!stored || stored.userId !== userId || stored.status === 'verified') return res.status(400).json({ code: 'invalid_order', error: 'This order cannot be verified.' });
  if (!verifyRazorpaySignature(orderId, paymentId, signature, keySecret)) { stored.status = 'signature_failed'; writeDb(db); return res.status(400).json({ code: 'signature_failed', error: 'Payment signature verification failed.' }); }
  try {
    const provider = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` } });
    const payment: any = await provider.json();
    const validPayment = provider.ok && payment.order_id === orderId && Number(payment.amount) === Number(stored.amountPaise) && payment.currency === 'INR' && ['captured', 'authorized'].includes(payment.status);
    if (!validPayment) { stored.status = 'payment_unconfirmed'; writeDb(db); return res.status(400).json({ code: 'payment_unconfirmed', error: 'The payment provider has not confirmed this payment.' }); }
    stored.status = 'verified'; stored.paymentId = paymentId; stored.verifiedAt = new Date().toISOString();
    db.users[userId].subscription = stored.planId;
    db.users[userId].billing = { planId: stored.planId, status: 'active', paymentId, activatedAt: stored.verifiedAt };
    writeDb(db);
    const user = db.users[userId];
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, subscription: user.subscription, role: user.role }, subscription: user.billing });
  } catch { res.status(502).json({ code: 'verification_failed', error: 'Payment verification could not be completed. You can retry safely.' }); }
});

// Admin Config & Usage Limits API Endpoints
app.get('/api/admin/config', (req, res) => {
  const db = readDb();
  res.json({ config: db.config });
});

app.post('/api/admin/config', (req, res) => {
  const db = readDb();
  const userId = getUserId(req);
  if (!userId || String(db.users[userId]?.role).toLowerCase() !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
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

app.get('/api/plan-entitlements', (req, res) => {
  const userId = getUserId(req);
  const db = readDb();
  const planId = userId && db.users[userId] ? String(db.users[userId].subscription || 'free') : 'free';
  const plan = db.config.plans?.[planId] || db.config.plans?.free;
  res.json({ planId, currency: db.config.pricing_currency || 'INR', features: plan?.features || [], limits: plan?.limits || {} });
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
