import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Terminal,
  MessageSquare,
  Sparkles,
  Send,
  User,
  Bot
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  title: string;
  desc: string;
}

export default function Automation() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'scraper' | 'chatbot'>('workflows');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tool 1: Workflow Builder States
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: '1', type: 'trigger', title: 'Webhook Received', desc: 'gxa.ai/v1/webhook/order_placed' },
    { id: '2', type: 'condition', title: 'Order Amount Filter', desc: 'Check if payload amount exceeds the threshold' },
    { id: '3', type: 'action', title: 'Send Slack Notification', desc: 'Relay order summary to #ops-alerts channel' },
    { id: '4', type: 'action', title: 'Provision API Key', desc: 'Create temporary client token' }
  ]);
  const [nodeTypeInput, setNodeTypeInput] = useState<'trigger' | 'condition' | 'action'>('action');
  const [nodeTitleInput, setNodeTitleInput] = useState('Update CRM CRM Contacts');
  const [nodeDescInput, setNodeDescInput] = useState('Sync user email status to Salesforce collection');

  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  // Tool 2: Web Scraper States
  const [scraperUrl, setScraperUrl] = useState('https://news.ycombinator.com');
  const [scraperQuery, setScraperQuery] = useState('Extract title and link of each news item card, looking for CSS classes named a.storylink.');
  const [scraperCode, setScraperCode] = useState<string>(`const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to target
  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle2' });
  
  // Extract content
  const results = await page.evaluate(() => {
    const cards = document.querySelectorAll('tr.athing');
    return Array.from(cards).map(card => {
      const titleNode = card.querySelector('td.title a');
      return {
        title: titleNode ? titleNode.innerText : '',
        url: titleNode ? titleNode.href : ''
      };
    });
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();`);

  // Tool 3: Chatbot Designer States
  const [botPersona, setBotPersona] = useState('A professional Technical Support engineer for GXA Technologies. Helpful, precise, and concise.');
  const [botMessages, setBotMessages] = useState<any[]>([
    { role: 'bot', text: 'Greetings from GXA Support. How can I assist you with your integrations or automation setups today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [botChatLoading, setBotChatLoading] = useState(false);

  // Node manipulation
  const addNode = () => {
    if (!nodeTitleInput || !nodeDescInput) return;
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type: nodeTypeInput,
      title: nodeTitleInput,
      desc: nodeDescInput
    };
    setNodes([...nodes, newNode]);
    setSuccessMsg('Added workflow node successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  // Simulate Workflow
  const handleSimulateWorkflow = () => {
    setSimulating(true);
    setSimulationLogs([]);
    let currentLog: string[] = [];

    setTimeout(() => {
      currentLog.push('[16:09:05] [TRIGGER] [Webhook Received] Webhook payload matched successfully.');
      setSimulationLogs([...currentLog]);
    }, 400);

    setTimeout(() => {
      currentLog.push('[16:09:05] [CONDITION] [Order Amount Filter] Evaluated amount exceeded configured threshold. MATCHED (TRUE)');
      setSimulationLogs([...currentLog]);
    }, 800);

    setTimeout(() => {
      currentLog.push('[16:09:06] [ACTION] [Send Slack Notification] Request piped to #ops-alerts. Status: 200 OK');
      setSimulationLogs([...currentLog]);
    }, 1200);

    setTimeout(() => {
      currentLog.push('[16:09:07] [ACTION] [Provision API Key] API key issued successfully. ID: gxa_user_key_823');
      currentLog.push('[16:09:07] [SUCCESS] Workflow execution finished. All nodes executed green.');
      setSimulationLogs([...currentLog]);
      setSimulating(false);
    }, 1600);
  };

  // Generate Web scraping script
  const handleGenerateScraper = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Write a clean, optimized Node.js Puppeteer or Cheerio scraping script.
Target URL: ${scraperUrl}
Requirements: ${scraperQuery}

Provide ONLY the valid executable code with brief and clear comments inside the code block. Do NOT include any markdown code block wrappers like \`\`\`.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are a staff operations engineer specializing in high-throughput node web scraping and data pipeline scripting.'
      });

      setScraperCode(response.trim());
      setSuccessMsg('Scraper script synthesized successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Scraping engine configuration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Live Chatbot response flow
  const handleChatWithBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || botChatLoading) return;

    const userMsg = { role: 'user', text: chatInput };
    setBotMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setBotChatLoading(true);

    try {
      const prompt = `Persona Description: ${botPersona}
Chat History:
${botMessages.map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.text}`).join('\n')}
User: ${userMsg.text}

Response:`;

      const response = await generateContent({
        prompt,
        systemInstruction: `You are simulating the configured chatbot. Follow the specified persona strictly: ${botPersona}. Keep the answer focused, technical, and accurate.`
      });

      setBotMessages(prev => [...prev, { role: 'bot', text: response.trim() }]);
    } catch (err: any) {
      setBotMessages(prev => [...prev, { role: 'bot', text: 'Error communicating with bot server. Please verify connections.' }]);
    } finally {
      setBotChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Automation Workspace</h2>
        <p className="text-neutral-400 text-sm mt-1">Design visual triggers, deploy headless web scrapers, and run custom support chatbots</p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => { setActiveTab('workflows'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'workflows' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Cpu className="h-4 w-4" /> Workflow Builder
        </button>
        <button 
          onClick={() => { setActiveTab('scraper'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'scraper' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Terminal className="h-4 w-4" /> Web Scraper
        </button>
        <button 
          onClick={() => { setActiveTab('chatbot'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'chatbot' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Chatbot Flow Designer
        </button>
      </div>

      {/* Messages */}
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

      {/* Workflow Builder */}
      {activeTab === 'workflows' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          {/* Node Config Panel */}
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" /> Assemble Action Node
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Node Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['trigger', 'condition', 'action'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNodeTypeInput(t)}
                    className={`rounded py-1.5 text-xs font-bold capitalize transition ${
                      nodeTypeInput === t 
                        ? 'bg-indigo-600 text-white border border-indigo-500' 
                        : 'bg-zinc-800 text-neutral-400 hover:bg-zinc-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Title / Name</label>
              <input 
                type="text" 
                value={nodeTitleInput}
                onChange={(e) => setNodeTitleInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Instructions / Parameters</label>
              <input 
                type="text" 
                value={nodeDescInput}
                onChange={(e) => setNodeDescInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              onClick={addNode}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white py-2.5 transition duration-200"
            >
              Inject Node into Canvas
            </button>
          </div>

          {/* Graphical Node Canvas */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-5">
                <h4 className="text-sm font-bold text-white">Visual Connected Workflow</h4>
                <button 
                  onClick={handleSimulateWorkflow}
                  disabled={simulating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run Sandbox Simulation
                </button>
              </div>

              {/* Connected node sequence */}
              <div className="flex flex-col items-center gap-4 py-4 overflow-y-auto max-h-[320px]">
                {nodes.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <div className="group relative w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/90 p-4 transition hover:border-indigo-500/50 flex justify-between items-center">
                      <div className="space-y-1 text-left">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          node.type === 'trigger' ? 'bg-indigo-500/20 text-indigo-400' :
                          node.type === 'condition' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {node.type}
                        </span>
                        <h5 className="text-xs font-extrabold text-white mt-1.5">{node.title}</h5>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">{node.desc}</p>
                      </div>
                      <button 
                        onClick={() => removeNode(node.id)}
                        className="text-zinc-500 hover:text-rose-400 transition p-1"
                        title="Delete node"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {index < nodes.length - 1 && (
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-4 w-4 text-zinc-600 rotate-90" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Simulated Debug Log */}
            {simulationLogs.length > 0 && (
              <div className="rounded-xl bg-black border border-zinc-800 p-5 shadow-2xl text-left animate-fade-in">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2 font-mono">Simulated Execution Console</span>
                <div className="space-y-1.5 font-mono text-[10px] text-zinc-300">
                  {simulationLogs.map((log, idx) => (
                    <div key={idx} className={log.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : log.includes('TRUE') ? 'text-indigo-300' : ''}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Web Scraper */}
      {activeTab === 'scraper' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Scraping Blueprint</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Domain URL</label>
              <input 
                type="text" 
                value={scraperUrl}
                onChange={(e) => setScraperUrl(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-xs text-indigo-400 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Parsing requirements / Selector Details</label>
              <textarea 
                value={scraperQuery}
                onChange={(e) => setScraperQuery(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                placeholder="Indicate CSS selectors, lists, pagination schemas, and outputs format (JSON/CSV)..."
              />
            </div>

            <button 
              onClick={handleGenerateScraper}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Compiling Script...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Generate Parser Script
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden shadow-2xl h-[420px] flex flex-col">
              <div className="flex items-center justify-between bg-zinc-900/90 px-4 py-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-neutral-400 font-mono">scraper.js</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(scraperCode);
                    setSuccessMsg('Copied script!');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-zinc-800 rounded"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 bg-black p-4 font-mono text-[11px] text-emerald-300 overflow-auto whitespace-pre leading-relaxed select-all">
                {scraperCode}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Designer */}
      {activeTab === 'chatbot' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Bot Personality Settings</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">System Instruction Rules</label>
              <textarea 
                value={botPersona}
                onChange={(e) => setBotPersona(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                placeholder="Give details about how the bot should behave, who it represents, and specific trigger actions..."
              />
            </div>
            
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-[11px] text-indigo-300 leading-relaxed">
              <Sparkles className="h-3.5 w-3.5 inline mr-1.5" /> Updates to personality automatically sync with the live sandboxed support widget.
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col rounded-xl bg-zinc-900/40 border border-zinc-800 h-[450px] overflow-hidden shadow-2xl">
            {/* Widget Header */}
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center text-left">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <h4 className="text-xs font-extrabold text-white">SaaS Support Agent Sandbox</h4>
                  <span className="text-[9px] text-zinc-500 font-mono">ID: bot_gxa_support_v2</span>
                </div>
              </div>
              <button 
                onClick={() => setBotMessages([{ role: 'bot', text: 'Greetings from GXA Support. How can I assist you with your integrations or automation setups today?' }])}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                Reset Session
              </button>
            </div>

            {/* Widget Messages Feed */}
            <div className="flex-1 bg-black/60 p-4 overflow-y-auto space-y-3 flex flex-col">
              {botMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[80%] items-start ${
                    msg.role === 'user' ? 'self-end flex-row-reverse text-right' : 'self-start text-left'
                  }`}
                >
                  <div className={`rounded-full p-1.5 shrink-0 ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-neutral-400'
                  }`}>
                    {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/20' : 'bg-zinc-900/80 text-neutral-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {botChatLoading && (
                <div className="flex gap-3 max-w-[80%] items-start self-start text-left">
                  <div className="rounded-full p-1.5 bg-zinc-800 text-neutral-400 shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 text-neutral-400 text-xs flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Widget Input bar */}
            <form onSubmit={handleChatWithBot} className="bg-zinc-900 border-t border-zinc-800 p-3 flex gap-2">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask configured support chatbot..."
                className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || botChatLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
