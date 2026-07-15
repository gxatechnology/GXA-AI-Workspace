import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Edit3, FileText, Image, Loader2, Menu, MoreHorizontal, Paperclip, Pin, Plus, RefreshCw, Send, Square, Trash2, X } from 'lucide-react';
import { fetchSystemConfig, fetchUsage, isUserPremium, SystemConfig, UsageStats } from '../../utils/limits';

type Attachment = { name: string; type: string; size: number; content?: string; preview?: string };
type Message = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; status?: 'streaming' | 'complete' | 'interrupted' | 'error'; attachments?: Attachment[] };
type Conversation = { id: string; title: string; messages: Message[]; pinned: boolean; projectId?: string; createdAt: string; updatedAt: string };
type Project = { id: string; name: string };

interface AIChatProps { currentUser?: any; onOpenUpgradeModal?: () => void }
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`')) return <code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[.9em] dark:bg-zinc-800">{part.slice(1, -1)}</code>;
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i].startsWith('```')) {
      const language = lines[i].slice(3).trim(); const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      nodes.push(<div key={nodes.length} className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 dark:border-zinc-700"><div className="border-b border-white/10 px-3 py-1.5 text-[11px] text-slate-400">{language || 'code'}</div><pre className="overflow-x-auto p-4 text-xs"><code>{code.join('\n')}</code></pre></div>); continue;
    }
    if (lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
      const headers = lines[i].split('|').map(v => v.trim()).filter(Boolean); i += 2; const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) rows.push(lines[i++].split('|').map(v => v.trim()).filter(Boolean));
      nodes.push(<div key={nodes.length} className="my-3 overflow-x-auto"><table className="min-w-full border-collapse text-sm"><thead><tr>{headers.map(h => <th key={h} className="border border-slate-200 bg-slate-50 p-2 text-left dark:border-zinc-700 dark:bg-zinc-800">{inline(h)}</th>)}</tr></thead><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-slate-200 p-2 dark:border-zinc-700">{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    if (/^[-*] /.test(lines[i])) { const items: string[] = []; while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2)); nodes.push(<ul key={nodes.length} className="my-2 list-disc space-y-1 pl-6">{items.map((v, n) => <li key={n}>{inline(v)}</li>)}</ul>); continue; }
    if (/^\d+\. /.test(lines[i])) { const items: string[] = []; while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, '')); nodes.push(<ol key={nodes.length} className="my-2 list-decimal space-y-1 pl-6">{items.map((v, n) => <li key={n}>{inline(v)}</li>)}</ol>); continue; }
    const heading = lines[i].match(/^(#{1,3})\s+(.+)/);
    if (heading) { const Tag = `h${heading[1].length + 1}` as keyof React.JSX.IntrinsicElements; nodes.push(<Tag key={nodes.length} className="mb-2 mt-4 font-semibold">{inline(heading[2])}</Tag>); i++; continue; }
    if (!lines[i].trim()) { nodes.push(<div key={nodes.length} className="h-2" />); i++; continue; }
    nodes.push(<p key={nodes.length} className="my-1 leading-7">{inline(lines[i])}</p>); i++;
  }
  return <div>{nodes}</div>;
}

export default function AIChat({ currentUser, onOpenUpgradeModal }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [temporaryConversation, setTemporaryConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = currentUser?.email || currentUser?.id || '';
  const premium = isUserPremium(currentUser);
  const active = temporary ? temporaryConversation : conversations.find(chat => chat.id === activeId) || null;
  const remaining = premium ? Infinity : Math.max(0, (config?.ai_chats_limit || 5) - (usage?.chats || 0));

  useEffect(() => {
    Promise.all([fetchSystemConfig(), fetchUsage(userId || 'guest')]).then(([nextConfig, nextUsage]) => { setConfig(nextConfig); setUsage(nextUsage); });
    if (!userId) { setConversations([]); setProjects([]); return; }
    Promise.all([
      fetch('/api/chats', { headers: { Authorization: `Bearer ${userId}` } }).then(r => r.ok ? r.json() : { chats: [] }),
      fetch('/api/projects', { headers: { Authorization: `Bearer ${userId}` } }).then(r => r.ok ? r.json() : { projects: [] })
    ]).then(([chatData, projectData]) => { setConversations(chatData.chats || []); setProjects(projectData.projects || []); setActiveId(chatData.chats?.[0]?.id || null); });
  }, [userId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages, loading]);

  const freshConversation = (): Conversation => ({ id: id(), title: 'New chat', messages: [], pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const newChat = () => { setError(''); setInput(''); setAttachments([]); const next = freshConversation(); if (temporary) setTemporaryConversation(next); else { setConversations(current => [next, ...current]); setActiveId(next.id); } setSidebarOpen(false); };
  const updateConversation = (next: Conversation, persist = true) => {
    if (temporary) setTemporaryConversation(next); else setConversations(list => list.some(c => c.id === next.id) ? list.map(c => c.id === next.id ? next : c) : [next, ...list]);
    if (persist && userId && !temporary) fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` }, body: JSON.stringify({ conversation: next }) }).catch(() => setError('The response is safe, but conversation history could not be saved.'));
  };

  const readFiles = async (files: FileList | null) => {
    if (!files || !config) return;
    const maxCount = config.chat_attachment_limit || 3, maxBytes = (config.chat_attachment_size_mb || 5) * 1024 * 1024;
    const allowed = /^(text\/|image\/(png|jpeg|webp|gif)$|application\/(pdf|json)$)/;
    const selected = Array.from(files);
    if (attachments.length + selected.length > maxCount) return setError(`You can attach up to ${maxCount} files.`);
    for (const file of selected) if (!allowed.test(file.type)) return setError(`${file.name} is not a supported file type.`); else if (file.size > maxBytes) return setError(`${file.name} exceeds the ${config.chat_attachment_size_mb || 5} MB limit.`);
    const next = await Promise.all(selected.map(async file => {
      if (file.type.startsWith('text/') || file.type === 'application/json') return { name: file.name, type: file.type, size: file.size, content: (await file.text()).slice(0, 100000) };
      if (file.type.startsWith('image/') || file.type === 'application/pdf') return { name: file.name, type: file.type, size: file.size, content: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }), ...(file.type.startsWith('image/') ? { preview: URL.createObjectURL(file) } : {}) };
      return { name: file.name, type: file.type, size: file.size };
    }));
    setAttachments(current => [...current, ...next]); setError('');
  };

  const stream = async (conversation: Conversation, messages: Message[], outgoingAttachments: Attachment[] = []) => {
    if (!premium && remaining <= 0) { onOpenUpgradeModal?.(); return; }
    if (config?.chat_premium_required && !premium) { onOpenUpgradeModal?.(); return; }
    const assistant: Message = { id: id(), role: 'assistant', content: '', createdAt: new Date().toISOString(), status: 'streaming' };
    let next = { ...conversation, messages: [...messages, assistant], updatedAt: new Date().toISOString() };
    updateConversation(next, false); setLoading(true); setError('');
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch('/api/chat/stream', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${userId}` } : {}) }, body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })), attachments: outgoingAttachments.map(({ preview, ...file }) => file) }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); if (response.status === 403 || data.code === 'usage_limit') onOpenUpgradeModal?.(); throw new Error(data.error || 'The request could not be completed.'); }
      if (!response.body) throw new Error('Streaming is not supported by this browser.');
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', complete = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n'); buffer = events.pop() || '';
        for (const event of events) if (event.startsWith('data: ')) {
          const data = JSON.parse(event.slice(6));
          if (data.type === 'delta') { assistant.content += data.text; next = { ...next, messages: next.messages.map(m => m.id === assistant.id ? { ...assistant } : m) }; updateConversation(next, false); }
          if (data.type === 'done') complete = true;
          if (data.type === 'error') throw new Error(data.message);
        }
      }
      assistant.status = complete ? 'complete' : 'interrupted'; next = { ...next, messages: next.messages.map(m => m.id === assistant.id ? { ...assistant } : m) }; updateConversation(next);
      setUsage(current => current ? { ...current, chats: current.chats + 1 } : current);
    } catch (cause: any) {
      assistant.status = controller.signal.aborted ? 'interrupted' : 'error';
      next = { ...next, messages: next.messages.map(m => m.id === assistant.id ? { ...assistant } : m) }; updateConversation(next, Boolean(assistant.content));
      if (!controller.signal.aborted) setError(cause?.message || 'The provider is unavailable. Your message and any partial response were preserved.');
    } finally { setLoading(false); abortRef.current = null; }
  };

  const send = async () => {
    const text = input.trim(); if (loading || (!text && !attachments.length)) return;
    const conversation = active || freshConversation();
    const userMessage: Message = { id: id(), role: 'user', content: text || 'Please review the attached file.', createdAt: new Date().toISOString(), attachments: attachments.map(({ content, preview, ...meta }) => meta) };
    const next = { ...conversation, title: conversation.messages.length ? conversation.title : (text || attachments[0]?.name || 'New chat').slice(0, 60), messages: [...conversation.messages, userMessage] };
    if (!temporary) setActiveId(next.id); else setTemporaryConversation(next);
    const files = attachments; setInput(''); setAttachments([]); await stream(next, next.messages, files);
  };
  const regenerate = () => { if (!active || loading) return; const messages = active.messages.at(-1)?.role === 'assistant' ? active.messages.slice(0, -1) : active.messages; if (messages.at(-1)?.role === 'user') stream({ ...active, messages }, messages); };
  const continueResponse = () => { if (!active || loading) return; const prompt: Message = { id: id(), role: 'user', content: 'Continue from where you stopped.', createdAt: new Date().toISOString() }; stream(active, [...active.messages, prompt]); };
  const saveEdit = () => { if (!active || !editingId || !editText.trim()) return; const index = active.messages.findIndex(m => m.id === editingId); const edited = { ...active.messages[index], content: editText.trim() }; const messages = [...active.messages.slice(0, index), edited]; setEditingId(null); setEditText(''); stream({ ...active, messages }, messages); };
  const rename = async (chat: Conversation) => { const title = window.prompt('Rename conversation', chat.title)?.trim(); if (title) updateConversation({ ...chat, title: title.slice(0, 100) }); };
  const remove = async (chat: Conversation) => { if (!window.confirm(`Delete “${chat.title}”?`)) return; setConversations(list => list.filter(c => c.id !== chat.id)); if (activeId === chat.id) setActiveId(null); if (userId) await fetch(`/api/chats/${chat.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${userId}` } }); };

  const history = useMemo(() => [...conversations].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [conversations]);
  return <div className="flex h-full min-h-0 bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
    {sidebarOpen && <button aria-label="Close history" className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform dark:border-zinc-800 dark:bg-zinc-900 md:static md:translate-x-0`}>
      <div className="flex items-center gap-2 p-3"><button onClick={newChat} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> New Chat</button><button className="p-2 md:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button></div>
      <label className="mx-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"><span>Temporary Chat</span><input type="checkbox" checked={temporary} onChange={e => { setTemporary(e.target.checked); if (e.target.checked && !temporaryConversation) setTemporaryConversation(freshConversation()); }} /></label>
      <div className="mt-3 flex-1 overflow-y-auto px-2"><p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{userId ? 'History' : 'Sign in to save history'}</p>{userId && !history.length && <p className="p-3 text-xs text-slate-500">Your conversations will appear here.</p>}{history.map(chat => <div key={chat.id} className={`group mb-1 flex items-center rounded-lg ${activeId === chat.id && !temporary ? 'bg-white shadow-sm dark:bg-zinc-800' : 'hover:bg-white/70 dark:hover:bg-zinc-800/60'}`}><button className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" onClick={() => { setTemporary(false); setActiveId(chat.id); setSidebarOpen(false); }}>{chat.pinned && <Pin className="mr-1 inline h-3 w-3" />}{chat.title}</button><div className="flex pr-1 opacity-0 group-hover:opacity-100"><button title="Pin" onClick={() => updateConversation({ ...chat, pinned: !chat.pinned })} className="p-1.5"><Pin className="h-3.5 w-3.5" /></button><button title="Rename" onClick={() => rename(chat)} className="p-1.5"><Edit3 className="h-3.5 w-3.5" /></button><button title="Delete" onClick={() => remove(chat)} className="p-1.5 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>
      {!premium && <div className="border-t border-slate-200 p-3 text-xs text-slate-500 dark:border-zinc-800">{remaining} of {config?.ai_chats_limit || 5} free chats remaining today</div>}
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 px-3 dark:border-zinc-800"><button className="p-2 md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{temporary ? 'Temporary Chat' : active?.title || 'AI Chat'}</h2>{temporary && <p className="text-[11px] text-slate-500">Not saved to history</p>}</div>{userId && active && !temporary && <select aria-label="Associate project" value={active.projectId || ''} onChange={e => updateConversation({ ...active, projectId: e.target.value || undefined })} className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"><option value="">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}</header>
      <section className="flex-1 overflow-y-auto"><div className="mx-auto max-w-3xl px-4 py-8">{!active?.messages.length && <div className="flex min-h-[45vh] flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-teal-50 p-4 text-teal-700 dark:bg-teal-950/40"><Send className="h-7 w-7" /></div><h1 className="text-xl font-semibold">How can I help?</h1><p className="mt-2 max-w-md text-sm text-slate-500">Start a conversation or attach a supported document or image. No sample conversations are loaded.</p></div>}{active?.messages.map((message, index) => <article key={message.id} className={`mb-6 ${message.role === 'user' ? 'ml-auto max-w-[88%]' : 'max-w-full'}`}><div className={message.role === 'user' ? 'rounded-2xl rounded-br-md bg-slate-100 px-4 py-3 dark:bg-zinc-800' : ''}>{editingId === message.id ? <div><textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full rounded-lg border p-3 dark:border-zinc-700 dark:bg-zinc-900" /><div className="mt-2 flex gap-2"><button onClick={saveEdit} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white">Save and send</button><button onClick={() => setEditingId(null)} className="text-xs">Cancel</button></div></div> : <Markdown text={message.content} />}{message.attachments?.map(file => <div key={file.name} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-zinc-700">{file.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{file.name}</div>)}</div><div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">{message.status === 'streaming' && <><Loader2 className="h-3 w-3 animate-spin" /> Generating</>}{message.status === 'interrupted' && 'Stopped — partial response preserved'}{message.status === 'error' && !message.content && 'No response received'}{message.content && <button title="Copy" onClick={() => { navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(null), 1500); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-zinc-800">{copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>}{message.role === 'user' && !loading && <button title="Edit message" onClick={() => { setEditingId(message.id); setEditText(message.content); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-zinc-800"><Edit3 className="h-3.5 w-3.5" /></button>}{message.role === 'assistant' && index === active.messages.length - 1 && !loading && <><button title="Regenerate" onClick={regenerate} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-zinc-800"><RefreshCw className="h-3.5 w-3.5" /></button>{message.status === 'interrupted' && <button onClick={continueResponse} className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800">Continue</button>}</>}</div></article>)}<div ref={bottomRef} /></div></section>
      <div className="border-t border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"><div className="mx-auto max-w-3xl">{error && <div className="mb-2 flex items-start justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}{attachments.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto">{attachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-zinc-700">{file.preview ? <img src={file.preview} className="h-7 w-7 rounded object-cover" /> : <FileText className="h-4 w-4" />}<span className="max-w-32 truncate">{file.name}</span><button onClick={() => setAttachments(list => list.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></div>)}</div>}<div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-teal-500 dark:border-zinc-700 dark:bg-zinc-900"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Message GXA AI…" className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none" /><div className="flex items-center justify-between"><div><input ref={fileRef} type="file" multiple hidden accept="text/*,application/json,application/pdf,image/png,image/jpeg,image/webp,image/gif" onChange={e => { readFiles(e.target.files); e.target.value = ''; }} /><button title="Attach files" onClick={() => fileRef.current?.click()} disabled={loading} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"><Paperclip className="h-4 w-4" /></button></div>{loading ? <button onClick={() => abortRef.current?.abort()} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"><Square className="h-3.5 w-3.5 fill-current" /> Stop</button> : <button onClick={send} disabled={!input.trim() && !attachments.length} className="rounded-xl bg-teal-600 p-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>}</div></div><p className="mt-1.5 text-center text-[10px] text-slate-400">AI can make mistakes. Verify important information.</p></div></div>
    </main>
  </div>;
}
