import React, { useState } from 'react';
import { 
  Code, 
  Database, 
  Terminal, 
  Zap, 
  Copy, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  GitBranch
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function Technology() {
  const [activeTab, setActiveTab] = useState<'code' | 'db' | 'api'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tool 1: Code Assistant States
  const [codeLang, setCodeLang] = useState('typescript');
  const [codePrompt, setCodePrompt] = useState('Create a fully typed React hook for managing localStorage state with expiry date support.');
  const [codeResult, setCodeResult] = useState<string>(`// LocalStorage Hook with Expiration
import { useState, useEffect } from 'react';

export function useLocalStorageWithExpiry<T>(key: string, initialValue: T, expiryInMs: number) {
  // Try to load cached value
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.expiry && Date.now() > parsed.expiry) {
          window.localStorage.removeItem(key);
          return initialValue;
        }
        return parsed.data;
      }
    } catch (e) {
      console.error(e);
    }
    return initialValue;
  });

  // Keep synced
  useEffect(() => {
    try {
      const expiry = Date.now() + expiryInMs;
      window.localStorage.setItem(key, JSON.stringify({ data: value, expiry }));
    } catch (e) {
      console.error(e);
    }
  }, [key, value, expiryInMs]);

  return [value, setValue] as const;
}`);

  // Tool 2: Database Architect States
  const [dbType, setDbType] = useState('postgresql');
  const [dbPrompt, setDbPrompt] = useState('A SaaS platform with users, workspace memberships, billing plans, and dynamic API key audit logs.');
  const [dbTables, setDbTables] = useState<any[]>([
    {
      name: 'users',
      cols: [
        { name: 'id', type: 'UUID', extra: 'PRIMARY KEY' },
        { name: 'email', type: 'VARCHAR(255)', extra: 'UNIQUE' },
        { name: 'created_at', type: 'TIMESTAMP', extra: 'DEFAULT NOW()' },
      ]
    },
    {
      name: 'workspaces',
      cols: [
        { name: 'id', type: 'UUID', extra: 'PRIMARY KEY' },
        { name: 'name', type: 'VARCHAR(100)', extra: '' },
        { name: 'owner_id', type: 'UUID', extra: 'REFERENCES users(id)' },
      ]
    },
    {
      name: 'audit_logs',
      cols: [
        { name: 'id', type: 'UUID', extra: 'PRIMARY KEY' },
        { name: 'workspace_id', type: 'UUID', extra: 'REFERENCES workspaces(id)' },
        { name: 'action', type: 'VARCHAR(50)', extra: '' },
        { name: 'payload', type: 'JSONB', extra: '' },
      ]
    }
  ]);
  const [dbSQL, setDbSQL] = useState<string>(`CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);`);

  // Tool 3: API Architect States
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [apiPath, setApiPath] = useState('/api/v1/workspace/audit-logs');
  const [apiPrompt, setApiPrompt] = useState('Create a secure API schema that handles page-by-page fetching of security audit logs. Include details such as timestamp, actor email, workspace reference, and outcome.');
  const [apiPayload, setApiPayload] = useState<string>(`{
  "status": "success",
  "data": {
    "logs": [
      {
        "id": "log_a8f9d0c2",
        "timestamp": "2026-07-13T16:09:00Z",
        "actor": {
          "id": "usr_91",
          "email": "tauqeerashraf250@gmail.com"
        },
        "workspace_id": "ws_enterprise_01",
        "action": "API_KEY_REVOKE",
        "outcome": "SUCCESS",
        "ip_address": "198.51.100.42"
      }
    ],
    "pagination": {
      "total_records": 1420,
      "page": 1,
      "limit": 10,
      "has_more": true
    }
  }
}`);
  const [apiMockHeaders, setApiMockHeaders] = useState<string>(`{
  "Content-Type": "application/json",
  "X-GXA-RateLimit-Limit": "1000",
  "X-GXA-RateLimit-Remaining": "994",
  "X-Request-ID": "gxa_req_82f1b"
}`);

  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Trigger copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('Copied content to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Run Real-time Code Assistant Generation
  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Write professional, production-ready code in ${codeLang}. 
Goal / Requirement: ${codePrompt}
Provide ONLY valid executable code with brief and clear developer comments inside the code block. Do NOT surround with markdown codeblocks tags like \`\`\`.`;
      
      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an elite Staff Frontend Architect at GXA Technologies. You write high-fidelity, production-grade, optimized code and patterns.'
      });
      setCodeResult(response.trim());
      setSuccessMsg('Code generated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate code. Please check API settings.');
    } finally {
      setLoading(false);
    }
  };

  // Run Real-time Database schema Generation
  const handleGenerateDb = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Create a database schema for: ${dbPrompt}
Database Type: ${dbType}

Please return the response as a JSON object with the following structure:
{
  "sql": "A SQL schema script containing all table creations, references, and default constraints",
  "tables": [
    {
      "name": "table_name",
      "cols": [
        { "name": "column_name", "type": "column_type", "extra": "extra modifiers" }
      ]
    }
  ]
}
Return ONLY valid JSON. No markdown wrappers.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an Enterprise SaaS Architect at GXA Technologies. You design structured SQL schemas and diagrams in JSON format.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      if (data.sql) setDbSQL(data.sql);
      if (data.tables) setDbTables(data.tables);
      setSuccessMsg('Database schema created!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Could not compile visual DB schema, generated standard fallback SQL.');
      // Fallback SQL generation if JSON parse fails
      try {
        const textResponse = await generateContent({
          prompt: `Generate standard SQL schema script based on ${dbPrompt} for database type ${dbType}. Do not write markdown wrappers.`,
          systemInstruction: 'You are an Enterprise SaaS database designer.'
        });
        setDbSQL(textResponse.trim());
      } catch (innerErr) {}
    } finally {
      setLoading(false);
    }
  };

  // Run Real-time API Endpoint Generation
  const handleGenerateApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Design an API endpoint. 
Method: ${apiMethod}
Path: ${apiPath}
Description: ${apiPrompt}

Provide a JSON output containing:
{
  "payload": "A string containing a beautifully indented Mock response JSON",
  "headers": "A string containing a beautifully indented response headers JSON"
}
Return ONLY valid JSON without markdown wrapping.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are a principal API architect designing pristine corporate API suites.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      if (data.payload) setApiPayload(data.payload);
      if (data.headers) setApiMockHeaders(data.headers);
      setSuccessMsg('Mock API endpoints prepared!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'API structure compilation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate endpoint call
  const handleSimulateApi = () => {
    setSimulating(true);
    setSimulatedResponse(null);
    setTimeout(() => {
      setSimulating(false);
      setSimulatedResponse(apiPayload);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Technology Workspace</h2>
        <p className="text-neutral-400 text-sm mt-1">Develop code templates, map relative database schemas, and deploy endpoint routers</p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => { setActiveTab('code'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'code' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Code className="h-4 w-4" /> Code Assistant
        </button>
        <button 
          onClick={() => { setActiveTab('db'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'db' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" /> Database Architect
        </button>
        <button 
          onClick={() => { setActiveTab('api'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'api' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Terminal className="h-4 w-4" /> API Architect
        </button>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-400 text-xs animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-rose-400 text-xs animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Code Assistant Workspace */}
      {activeTab === 'code' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" /> Instructions Panel
              </h3>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Target Language</label>
                <select 
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="rust">Rust</option>
                  <option value="python">Python</option>
                  <option value="golang">Go (Golang)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Functional Goal</label>
                <textarea 
                  value={codePrompt}
                  onChange={(e) => setCodePrompt(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Describe your module requirements..."
                />
              </div>

              <button 
                onClick={handleGenerateCode}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Structuring Code...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Synthesize Module
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden shadow-2xl h-[480px]">
            <div className="flex items-center justify-between bg-zinc-900/90 px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-neutral-400 ml-2 font-mono">WorkspaceIDE.{codeLang === 'typescript' ? 'ts' : codeLang === 'rust' ? 'rs' : 'py'}</span>
              </div>
              <button 
                onClick={() => copyToClipboard(codeResult)}
                className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-zinc-800"
                title="Copy Code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 bg-black p-4 font-mono text-xs overflow-auto text-indigo-200 leading-relaxed whitespace-pre select-all">
              {codeResult}
            </div>
          </div>
        </div>
      )}

      {/* Database Architect Workspace */}
      {activeTab === 'db' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-400" /> DB Modeler Panel
              </h3>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Engine Dialect</label>
                <select 
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Describe Entities</label>
                <textarea 
                  value={dbPrompt}
                  onChange={(e) => setDbPrompt(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Describe your table collections and relationship links..."
                />
              </div>

              <button 
                onClick={handleGenerateDb}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Mapping Relations...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Generate DB Schema
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* SVG Visual Schema ERD Node Viewer */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-indigo-400" /> Interactive Visual Relational Schema (ERD)
              </h4>
              <div className="bg-black/80 rounded-lg p-6 border border-zinc-800 overflow-x-auto min-h-[220px] flex items-center justify-center">
                <div className="flex flex-wrap justify-center gap-8 w-full">
                  {dbTables.map((table: any, idx) => (
                    <div key={idx} className="w-56 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden shadow-lg transform transition hover:scale-[1.02]">
                      <div className="bg-zinc-800 px-3 py-1.5 border-b border-zinc-700 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-indigo-300 font-mono flex items-center gap-1">
                          <Database className="h-3.5 w-3.5 text-zinc-400" /> {table.name}
                        </span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {table.cols && table.cols.map((col: any, colIdx: number) => (
                          <div key={colIdx} className="flex justify-between items-center text-[10px] font-mono border-b border-zinc-800/40 pb-1 last:border-0 last:pb-0">
                            <span className="text-zinc-200 font-semibold">{col.name}</span>
                            <div className="flex items-center gap-1 text-zinc-500">
                              <span>{col.type}</span>
                              {col.extra && col.extra.includes('PRIMARY') && (
                                <span className="text-[8px] bg-indigo-500/25 text-indigo-400 px-1 rounded font-bold font-sans">PK</span>
                              )}
                              {col.extra && col.extra.includes('REFERENCES') && (
                                <span className="text-[8px] bg-amber-500/25 text-amber-400 px-1 rounded font-bold font-sans">FK</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated SQL Editor */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
              <div className="flex justify-between items-center bg-zinc-900/95 px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-neutral-400 font-mono">schema.sql</span>
                <button 
                  onClick={() => copyToClipboard(dbSQL)}
                  className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-zinc-800"
                  title="Copy SQL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-black/90 p-4 font-mono text-[11px] text-indigo-200 overflow-auto max-h-[220px] leading-relaxed">
                {dbSQL}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Architect Workspace */}
      {activeTab === 'api' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-400" /> API Designer
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setApiMethod(m)}
                    className={`rounded py-1.5 text-xs font-bold transition ${
                      apiMethod === m 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-zinc-800 text-neutral-400 hover:bg-zinc-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Endpoint Path</label>
                <input 
                  type="text"
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Request / Response Schema Instructions</label>
                <textarea 
                  value={apiPrompt}
                  onChange={(e) => setApiPrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Describe query parameters or post request body payloads..."
                />
              </div>

              <button 
                onClick={handleGenerateApi}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating Endpoint...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Build Mock API Schema
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Header Spec */}
              <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                <div className="flex justify-between items-center bg-zinc-900/95 px-4 py-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-neutral-400 font-mono">Response Headers</span>
                  <button onClick={() => copyToClipboard(apiMockHeaders)} className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-zinc-800">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="bg-black p-4 font-mono text-[10px] text-neutral-300 overflow-auto h-36">
                  {apiMockHeaders}
                </div>
              </div>

              {/* Payload Spec */}
              <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                <div className="flex justify-between items-center bg-zinc-900/95 px-4 py-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-neutral-400 font-mono">Mock Response Payload</span>
                  <button onClick={() => copyToClipboard(apiPayload)} className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-zinc-800">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="bg-black p-4 font-mono text-[10px] text-indigo-300 overflow-auto h-36">
                  {apiPayload}
                </div>
              </div>
            </div>

            {/* Interactive API Tester Panel */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> Interactive Endpoint Simulator (Sandboxed client)
              </h4>
              <div className="space-y-4">
                <div className="flex items-stretch border border-zinc-800 rounded-lg overflow-hidden">
                  <span className="bg-zinc-800 text-xs text-white px-4 py-2.5 font-bold flex items-center justify-center">
                    {apiMethod}
                  </span>
                  <span className="bg-zinc-900 border-x border-zinc-800 text-xs text-indigo-400 px-3 font-mono flex items-center">
                    https://api.gxa.ai
                  </span>
                  <input 
                    type="text" 
                    readOnly 
                    value={apiPath}
                    className="flex-1 bg-black text-xs font-mono text-zinc-300 px-3 border-0 focus:outline-none"
                  />
                  <button 
                    onClick={handleSimulateApi}
                    disabled={simulating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 flex items-center gap-1.5 transition"
                  >
                    {simulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Send Request
                  </button>
                </div>

                {simulatedResponse && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 px-1">
                      <span>HTTP/2 200 OK</span>
                      <span>Resolved in 12ms</span>
                    </div>
                    <div className="bg-black rounded-lg p-4 font-mono text-[10px] text-emerald-400 border border-zinc-800 max-h-48 overflow-auto leading-relaxed">
                      {simulatedResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
