import React, { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDown, Check, Copy, Download, Edit3, FileText, Menu, MoreHorizontal, Paperclip, Pin, Plus, RefreshCw, Search, Send, ShieldCheck, Square, Trash2, X } from 'lucide-react';
import { fetchSystemConfig, fetchUsage, isUserPremium, SystemConfig, UsageStats } from '../../utils/limits';
import { WorkspaceId } from '../../types';

type MessageStatus = 'complete' | 'streaming' | 'stopped' | 'failed';
interface Attachment { id: string; name: string; mimeType: string; size: number; text?: string }
interface Message { id: string; role: 'user' | 'assistant'; content: string; status: MessageStatus; createdAt: string; attachments?: Attachment[]; parentMessageId?: string }
interface Conversation { id: string; title: string; projectId?: string; messages: Message[]; pinned: boolean; archivedAt?: string; createdAt: string; updatedAt: string }
interface Props { currentUser?: any; onOpenUpgradeModal?: () => void; onSelectWorkspace?: (id: WorkspaceId) => void; initialText?: string }

const suggestions = ['Write something', 'Brainstorm ideas', 'Summarize content', 'Explain a topic', 'Create a plan', 'Improve writing'];
const acceptedTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
const now = () => new Date().toISOString();
const temporaryConversation = (): Conversation => ({ id: `temporary-${crypto.randomUUID()}`, title: 'Temporary Chat', messages: [], pinned: false, createdAt: now(), updatedAt: now() });
const authHeaders = (user?: any): Record<string, string> => user?.email ? { Authorization: `Bearer ${user.email}` } : {};

function CodeBlock({ value, language }: { value: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } };
  return <div className="my-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100"><div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400"><span>{language || 'code'}</span><button onClick={copy} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800" aria-label="Copy code">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}</button></div><pre className="max-w-full overflow-x-auto p-4 text-xs leading-6"><code>{value}</code></pre></div>;
}

function MarkdownContent({ content }: { content: string }) {
  const sections = content.split(/```/);
  return <div className="min-w-0 space-y-2 text-sm leading-7">{sections.map((section, index) => {
    if (index % 2 === 1) { const [first, ...rest] = section.split('\n'); return <CodeBlock key={index} language={first.trim()} value={rest.join('\n').trim()} />; }
    return section.split('\n').map((line, lineIndex) => {
      if (/^###\s/.test(line)) return <h3 key={`${index}-${lineIndex}`} className="pt-2 text-base font-bold">{line.replace(/^###\s/, '')}</h3>;
      if (/^##\s/.test(line)) return <h2 key={`${index}-${lineIndex}`} className="pt-2 text-lg font-bold">{line.replace(/^##\s/, '')}</h2>;
      if (/^#\s/.test(line)) return <h1 key={`${index}-${lineIndex}`} className="pt-2 text-xl font-black">{line.replace(/^#\s/, '')}</h1>;
      if (/^[-*]\s/.test(line)) return <div key={`${index}-${lineIndex}`} className="flex gap-2 pl-2"><span aria-hidden>•</span><span>{line.replace(/^[-*]\s/, '')}</span></div>;
      if (/^\d+\.\s/.test(line)) return <div key={`${index}-${lineIndex}`} className="pl-2">{line}</div>;
      if (/^>\s/.test(line)) return <blockquote key={`${index}-${lineIndex}`} className="border-l-2 border-teal-500 pl-3 text-slate-500 dark:text-zinc-400">{line.replace(/^>\s/, '')}</blockquote>;
      return line ? <p key={`${index}-${lineIndex}`} className="whitespace-pre-wrap break-words">{line}</p> : <br key={`${index}-${lineIndex}`} />;
    });
  })}</div>;
}

function MessageCard({ message, onRetry, onRegenerate, onEdit, onHandoff }: { message: Message; onRetry: () => void; onRegenerate: () => void; onEdit: () => void; onHandoff: (route: WorkspaceId) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } };
  return <article aria-label={`${message.role === 'user' ? 'You' : 'GXA AI'} message`} className={`group mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 ${message.role === 'assistant' ? 'bg-white/80 dark:bg-zinc-900/50' : ''}`}>
    <div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black ${message.role === 'assistant' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>{message.role === 'assistant' ? 'GX' : 'YOU'}</span><strong className="text-xs">{message.role === 'assistant' ? 'GXA AI' : 'You'}</strong><time className="text-[10px] text-slate-400" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>{message.status !== 'complete' && <span className="text-[10px] font-bold text-amber-600">{message.status === 'streaming' ? 'Generating' : message.status === 'stopped' ? 'Stopped' : 'Failed'}</span>}</div>
    {message.attachments?.length ? <div className="mb-3 flex flex-wrap gap-2">{message.attachments.map(file => <span key={file.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] dark:bg-zinc-800"><FileText className="h-3 w-3" />{file.name}</span>)}</div> : null}
    <MarkdownContent content={message.content || (message.status === 'streaming' ? 'Preparing response…' : '')} />
    <div className="mt-3 flex flex-wrap gap-1 opacity-100 sm:opacity-70 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
      <button onClick={copy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="Copy message">{copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}</button>
      {message.role === 'user' && <button onClick={onEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="Edit and resend"><Edit3 className="h-4 w-4" /></button>}
      {message.role === 'assistant' && <><button onClick={message.status === 'failed' ? onRetry : onRegenerate} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label={message.status === 'failed' ? 'Retry' : 'Regenerate'}><RefreshCw className="h-4 w-4" /></button><details className="relative"><summary className="list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="More response actions"><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute bottom-10 left-0 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"><button onClick={() => onHandoff('ai-writing')} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">Open in AI Writer</button><button onClick={() => onHandoff('paraphrasing')} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">Open in Paraphraser</button><button onClick={() => onHandoff('grammar')} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">Check Grammar</button></div></details></>}
    </div>
  </article>;
}

export default function AIChat({ currentUser, onOpenUpgradeModal, onSelectWorkspace, initialText = '' }: Props) {
  const authenticated = Boolean(currentUser && !currentUser.guest && currentUser.email);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation>(() => temporaryConversation());
  const [draft, setDraft] = useState(() => initialText || sessionStorage.getItem('gxa_chat_draft') || '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [temporary, setTemporary] = useState(!authenticated);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const maxFiles = config?.chat_attachment_limit || 3;
  const maxBytes = (config?.chat_attachment_size_mb || 10) * 1024 * 1024;
  const maxChars = config?.chat_message_character_limit || 20_000;
  const limit = isUserPremium(currentUser) ? Infinity : config?.ai_chats_limit || 5;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - (usage?.chats || 0));

  const loadHistory = async () => {
    if (!authenticated) { setConversations([]); return; }
    try { const response = await fetch('/api/chats', { headers: authHeaders(currentUser) }); if (!response.ok) throw new Error(); const data = await response.json(); setConversations(data.chats || []); } catch { setError('Conversation history is unavailable. You can continue in a temporary chat.'); }
  };

  useEffect(() => { Promise.all([fetchSystemConfig(), fetchUsage(currentUser?.email || 'guest')]).then(([nextConfig, nextUsage]) => { setConfig(nextConfig); setUsage(nextUsage); }); loadHistory(); }, [currentUser?.email]);
  useEffect(() => { sessionStorage.setItem('gxa_chat_draft', draft); }, [draft]);
  useEffect(() => { if (!loading) return; const element = scrollRef.current; if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 180) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active.messages, loading]);

  const refreshActive = (conversation: Conversation) => { setActive(conversation); setConversations(items => [conversation, ...items.filter(item => item.id !== conversation.id)]); };
  const newChat = () => { if (!active.messages.length && active.title === 'Temporary Chat') return; setActive(temporaryConversation()); setDraft(''); setAttachments([]); setError(''); setSidebarOpen(false); setTimeout(() => composerRef.current?.focus(), 0); };

  const updateConversation = async (id: string, patch: object) => {
    if (!authenticated) { onOpenUpgradeModal?.(); return; }
    const response = await fetch(`/api/chats/${id}`, { method: 'PATCH', headers: { ...authHeaders(currentUser), 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Update failed.');
    const data = await response.json(); refreshActive(data.conversation); await loadHistory();
  };

  const removeConversation = async (id: string) => {
    const response = await fetch(`/api/chats/${id}`, { method: 'DELETE', headers: authHeaders(currentUser) });
    if (!response.ok) throw new Error('Conversation could not be deleted.');
    setConversations(items => items.filter(item => item.id !== id)); setActive(temporaryConversation()); setConfirmDelete(null);
  };

  const readFiles = async (files: File[]) => {
    setError('');
    const available = Math.max(0, maxFiles - attachments.length);
    for (const file of files.slice(0, available)) {
      if (!acceptedTypes.includes(file.type) || file.size > maxBytes) { setError(`${file.name} is unsupported or exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`); continue; }
      try { const text = await file.text(); setAttachments(items => [...items, { id: crypto.randomUUID(), name: file.name, mimeType: file.type, size: file.size, text }]); } catch { setError(`${file.name} could not be read. Your draft was preserved.`); }
    }
  };

  const send = async (text = draft, baseMessages = active.messages) => {
    const content = text.trim();
    if ((!content && !attachments.length) || loading) return;
    if (content.length > maxChars) { setError(`Message exceeds the ${maxChars.toLocaleString()} character limit.`); return; }
    if (remaining <= 0) { setError('Daily chat limit reached. Your draft and conversation are preserved.'); onOpenUpgradeModal?.(); return; }
    setError(''); setLoading(true); setDraft(''); sessionStorage.removeItem('gxa_chat_draft');
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content, status: 'complete', createdAt: now(), attachments };
    const assistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', status: 'streaming', createdAt: now(), parentMessageId: userMessage.id };
    let working: Conversation = { ...active, messages: [...baseMessages, userMessage, assistantMessage], updatedAt: now(), title: active.messages.length ? active.title : (content.slice(0, 48) || 'File conversation') };
    setActive(working); setAttachments([]);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch('/api/chat/stream', { method: 'POST', signal: controller.signal, headers: { ...authHeaders(authenticated ? currentUser : undefined), 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: authenticated && !temporary && !active.id.startsWith('temporary-') ? active.id : undefined, persist: authenticated && !temporary, content, attachments: userMessage.attachments, messages: baseMessages, projectId: active.projectId }) });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'The response could not be started.'); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue; const event = JSON.parse(line);
          if (event.type === 'meta') working = { ...working, id: event.conversationId || working.id, title: event.title || working.title };
          if (event.type === 'delta') working = { ...working, messages: working.messages.map(message => message.id === assistantMessage.id ? { ...message, content: message.content + event.text } : message) };
          if (event.type === 'done') { working = { ...working, messages: working.messages.map(message => message.id === assistantMessage.id ? event.message : message) }; setUsage(event.usage); }
          if (event.type === 'error') throw new Error(event.error);
          setActive(working);
        }
      }
      if (authenticated && !temporary) await loadHistory();
    } catch (cause: any) {
      const stopped = cause?.name === 'AbortError';
      working = { ...working, messages: working.messages.map(message => message.id === assistantMessage.id ? { ...message, status: stopped ? 'stopped' : 'failed', content: message.content || (stopped ? 'Generation stopped.' : '') } : message) };
      setActive(working); if (!stopped) { setError(cause?.message || 'Response interrupted. Retry when you are ready.'); setDraft(content); }
    } finally { setLoading(false); abortRef.current = null; }
  };

  const stop = () => abortRef.current?.abort();
  const retry = () => { const user = [...active.messages].reverse().find(message => message.role === 'user'); if (user) send(user.content, active.messages.filter(message => message.status !== 'failed')); };
  const regenerate = () => { const userIndex = active.messages.map(message => message.role).lastIndexOf('user'); if (userIndex >= 0) send('Please provide another response to my previous message.', active.messages.slice(0, userIndex + 1)); };
  const editAndResend = () => { if (!editing) return; const index = active.messages.findIndex(message => message.id === editing.id); const text = draft.trim(); setEditing(null); if (index >= 0 && text) send(text, active.messages.slice(0, index)); };
  const exportConversation = () => { const text = active.messages.map(message => `## ${message.role === 'user' ? 'You' : 'GXA AI'}\n\n${message.content}`).join('\n\n'); const url = URL.createObjectURL(new Blob([`# ${active.title}\n\n${text}`], { type: 'text/markdown' })); const link = document.createElement('a'); link.href = url; link.download = `${active.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'gxa-chat'}.md`; link.click(); URL.revokeObjectURL(url); };
  const handoff = (route: WorkspaceId, content: string) => { sessionStorage.setItem('gxa_tool_handoff', content); onSelectWorkspace?.(route); };

  const filtered = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const pinned = filtered.filter(item => item.pinned && !item.archivedAt); const recent = filtered.filter(item => !item.pinned && !item.archivedAt);
  const selectConversation = (conversation: Conversation) => { setActive(conversation); setTemporary(false); setSidebarOpen(false); setError(''); };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); editing ? editAndResend() : send(); } };

  const sidebar = <aside aria-label="Conversation history" className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="p-3"><button onClick={newChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-xs font-black text-white hover:bg-teal-600"><Plus className="h-4 w-4" /> New Chat</button></div>
    {authenticated ? <><div className="px-3"><label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><span className="sr-only">Search chats</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search chat titles" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900" /></label></div><div className="flex-1 overflow-y-auto p-3">
      {([['Pinned', pinned], ['Recent', recent]] as [string, Conversation[]][]).map(([label, items]) => <section key={label} className="mb-5"><h2 className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</h2>{items.length ? items.map(conversation => <div key={conversation.id} className={`group mb-1 flex items-center rounded-xl ${active.id === conversation.id ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'}`}><button onClick={() => selectConversation(conversation)} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-xs font-semibold">{conversation.title}</button><details className="relative mr-1"><summary className="list-none rounded-lg p-1.5 text-slate-400 hover:bg-white dark:hover:bg-zinc-800" aria-label={`Actions for ${conversation.title}`}><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 top-8 z-30 w-40 rounded-xl border bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"><button onClick={() => updateConversation(conversation.id, { pinned: !conversation.pinned })} className="flex w-full gap-2 rounded-lg px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800"><Pin className="h-3.5 w-3.5" />{conversation.pinned ? 'Unpin' : 'Pin'}</button><button onClick={() => updateConversation(conversation.id, { archived: true })} className="flex w-full gap-2 rounded-lg px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800"><Archive className="h-3.5 w-3.5" />Archive</button><button onClick={() => { const title = window.prompt('Rename conversation', conversation.title); if (title) updateConversation(conversation.id, { title }); }} className="flex w-full gap-2 rounded-lg px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800"><Edit3 className="h-3.5 w-3.5" />Rename</button><button onClick={() => setConfirmDelete(conversation.id)} className="flex w-full gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></details></div>) : <p className="px-2 py-3 text-xs text-slate-400">No {label.toLowerCase()} conversations.</p>}</section>)}
    </div></> : <div className="m-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"><ShieldCheck className="mb-2 h-5 w-5 text-teal-500" /><strong className="block text-slate-800 dark:text-zinc-100">Temporary guest chat</strong><p className="mt-1 leading-5">Sign in to save, search, rename, pin, archive, or reopen conversations.</p></div>}
  </aside>;

  return <div className="relative -m-3 flex h-[calc(100vh-4rem)] min-h-[560px] overflow-hidden bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 sm:-m-5 lg:-m-7">
    <div className="hidden lg:block">{sidebar}</div>{sidebarOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="absolute inset-0 bg-slate-950/50" onClick={() => setSidebarOpen(false)} /> <div className="relative">{sidebar}</div></div>}
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-5"><div className="flex min-w-0 items-center gap-2"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 lg:hidden" aria-label="Open conversation history"><Menu className="h-5 w-5" /></button><div className="min-w-0"><h1 className="truncate text-sm font-black">{active.title}</h1><p className="truncate text-[10px] text-slate-400">{temporary || !authenticated ? 'Temporary · not saved to history' : active.projectId ? 'Saved · project conversation' : 'Saved conversation'}</p></div></div><div className="flex items-center gap-1"><button onClick={() => { if (!authenticated) { onOpenUpgradeModal?.(); return; } setTemporary(value => !value); newChat(); }} className={`hidden rounded-lg px-2.5 py-2 text-[10px] font-bold sm:block ${temporary ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900'}`}>Temporary {temporary ? 'on' : 'off'}</button><button onClick={exportConversation} disabled={!active.messages.length} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-900" aria-label="Export conversation"><Download className="h-4 w-4" /></button></div></header>
      <div ref={scrollRef} onScroll={event => { const element = event.currentTarget; setShowJump(element.scrollHeight - element.scrollTop - element.clientHeight > 280); }} className="relative flex-1 overflow-y-auto overflow-x-hidden" role="log" aria-live="polite" aria-label="Chat messages">
        {!active.messages.length ? <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center"><span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-sm font-black text-white shadow-lg shadow-teal-500/20">GX</span><h2 className="text-2xl font-black sm:text-3xl">How can GXA AI help?</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-zinc-400">Ask a question, develop an idea, improve writing, or attach a supported text file. Answers can be wrong—verify important information.</p><div className="mt-7 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">{suggestions.map(item => <button key={item} onClick={() => { setDraft(item); composerRef.current?.focus(); }} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-bold hover:border-teal-400 hover:text-teal-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-600">{item}</button>)}</div></div> : active.messages.map(message => <MessageCard key={message.id} message={message} onRetry={retry} onRegenerate={regenerate} onEdit={() => { setEditing(message); setDraft(message.content); composerRef.current?.focus(); }} onHandoff={route => handoff(route, message.content)} />)}<div ref={bottomRef} />
        {showJump && <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="sticky bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-lg dark:border-zinc-700 dark:bg-zinc-900"><ArrowDown className="h-3.5 w-3.5" /> Latest</button>}
      </div>
      <footer className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-3 pb-3 pt-2 dark:from-zinc-950 dark:via-zinc-950 sm:px-6 sm:pb-5"><div className="mx-auto max-w-3xl">
        {error && <div role="alert" className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
        {editing && <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><span>Editing creates a new path from this message; later messages remain in the original conversation.</span><button onClick={() => { setEditing(null); setDraft(''); }} aria-label="Cancel edit"><X className="h-4 w-4" /></button></div>}
        {attachments.length ? <div className="mb-2 flex flex-wrap gap-2">{attachments.map(file => <span key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"><FileText className="h-3.5 w-3.5 text-teal-500" /><span className="truncate">{file.name}</span><button onClick={() => setAttachments(items => items.filter(item => item.id !== file.id))} aria-label={`Remove ${file.name}`}><X className="h-3.5 w-3.5" /></button></span>)}</div> : null}
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); editing ? editAndResend() : send(); }} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/40 focus-within:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"><textarea ref={composerRef} value={draft} onChange={event => { setDraft(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`; }} onKeyDown={onComposerKeyDown} rows={1} maxLength={maxChars + 1} placeholder="Message GXA AI" aria-label="Message GXA AI" className="max-h-44 min-h-11 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-400" /><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" className="hidden" onChange={event => { readFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /><button type="button" onClick={() => fileRef.current?.click()} disabled={attachments.length >= maxFiles} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="Attach text file"><Paperclip className="h-4 w-4" /></button><span className={`text-[10px] ${draft.length > maxChars ? 'font-bold text-rose-600' : 'text-slate-400'}`}>{draft.length.toLocaleString()}/{maxChars.toLocaleString()} · {remaining === Infinity ? 'Plan access' : `${remaining} chats left`}</span></div>{loading ? <button type="button" onClick={stop} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900" aria-label="Stop generation"><Square className="h-3.5 w-3.5 fill-current" /></button> : <button type="submit" disabled={(!draft.trim() && !attachments.length) || draft.length > maxChars} className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-30" aria-label={editing ? 'Save edit and resend' : 'Send message'}><Send className="h-4 w-4" /></button>}</div></form><p className="mt-2 text-center text-[10px] text-slate-400">Enter to send · Shift+Enter for a new line · Text, Markdown, CSV and JSON attachments</p>
      </div></footer>
    </section>
    {confirmDelete && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-chat-title"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900"><h2 id="delete-chat-title" className="font-black">Delete conversation?</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">This removes the conversation from your history. This action cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="rounded-xl px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800">Cancel</button><button onClick={() => removeConversation(confirmDelete).catch(cause => setError(cause.message))} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white">Delete</button></div></div></div>}
  </div>;
}
