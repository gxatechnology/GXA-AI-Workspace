import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, BriefcaseBusiness, Check, ChevronRight, FileSearch, FileText,
  Languages, Mail, Menu, MessageSquareText, Moon, Search, ShieldCheck, Sparkles, Sun, X,
} from 'lucide-react';
import { toolRegistry } from '../../toolRegistry';
import {
  COMPANY, HELP_CATEGORIES, PAGE_BY_PATH, PUBLIC_FAQS, PUBLIC_PAGES, PUBLIC_PATHS,
  type PublicPageDefinition,
} from '../../public/content';

interface Props {
  theme: 'light' | 'dark';
  isAuthenticated: boolean;
  onToggleTheme: () => void;
  onOpenWorkspace: () => void;
  onShowPricing: () => void;
  onLogin: () => void;
  onRegister: () => void;
  initialPath?: string;
}

const featureRoutes = ['ai-writing', 'business', 'career', 'pdf-intelligence', 'translation', 'ai-chat', 'grammar', 'paraphrasing', 'summarizer', 'templates'] as const;
const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'ai-writing': Sparkles, business: BriefcaseBusiness, career: FileText, 'pdf-intelligence': FileSearch,
  translation: Languages, 'ai-chat': MessageSquareText, grammar: Check, paraphrasing: FileText,
  summarizer: BookOpen, templates: FileText,
};

const footerGroups = [
  { title: 'Product', links: [['Workspace', '/#/home'], ['Pricing', '/#/pricing'], ['AI Chat', '/#/ai-chat'], ['PDF Tools', '/#/pdf-intelligence']] },
  { title: 'Writing Tools', links: [['AI Writer', '/#/ai-writing'], ['Grammar Checker', '/#/grammar'], ['Paraphraser', '/#/paraphrasing'], ['Translator', '/#/translation']] },
  { title: 'Studios', links: [['Business Studio', '/#/business'], ['Career Studio', '/#/career'], ['Templates', '/#/templates']] },
  { title: 'Resources', links: [['Help Center', '/help'], ['Documentation', '/docs'], ['FAQ', '/faq'], ['Release Notes', '/release-notes'], ['Changelog', '/changelog']] },
  { title: 'Company', links: [['About', '/about'], ['Careers', '/careers'], ['Contact', '/contact'], ['System Status', '/status']] },
  { title: 'Support', links: [['Contact Support', '/contact'], ['Help Center', '/help'], ['System Status', '/status']] },
  { title: 'Trust', links: [['Trust Center', '/trust'], ['Security', '/security'], ['Responsible AI', '/responsible-ai'], ['AI Usage Policy', '/ai-usage-policy']] },
  { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Refund Policy', '/refund-policy'], ['Cancellation Policy', '/cancellation-policy'], ['Cookie Policy', '/cookie-policy']] },
] as const;

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

function usePublicSeo(path: string, page?: PublicPageDefinition) {
  useEffect(() => {
    const title = page ? `${page.title} | ${COMPANY.product}` : `Page not found | ${COMPANY.product}`;
    const description = page?.description || `The requested ${COMPANY.product} page could not be found.`;
    const canonical = `${COMPANY.productionUrl}${path === '/' ? '' : path}`;
    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
    const id = 'gxa-public-page-schema';
    document.getElementById(id)?.remove();
    const schema = document.createElement('script'); schema.id = id; schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: path === '/' ? [{ '@type': 'ListItem', position: 1, name: 'Home', item: COMPANY.productionUrl }] : [
        { '@type': 'ListItem', position: 1, name: 'Home', item: COMPANY.productionUrl },
        { '@type': 'ListItem', position: 2, name: page?.title || 'Not Found', item: canonical },
      ],
    });
    document.head.appendChild(schema);
    return () => schema.remove();
  }, [path, page]);
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className="flex items-center gap-3"><span className="theme-brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black">GX</span><span><strong className="block text-sm leading-none">GXA AI Workspace</strong><span className={`mt-1 block text-[10px] ${inverse ? 'text-slate-400' : 'text-slate-500 dark:text-zinc-400'}`}>GXA Technologies</span></span></span>;
}

function PublicHeader({ theme, isAuthenticated, onToggleTheme, onOpenWorkspace, onShowPricing, onLogin, onRegister, onSearch }: Props & { onSearch: () => void }) {
  const [open, setOpen] = useState(false);
  const navigation = [['Product', '/'], ['Pricing', '#pricing'], ['Resources', '/resources'], ['Trust', '/trust'], ['Company', '/about']] as const;
  const activate = (href: string) => { setOpen(false); if (href === '#pricing') onShowPricing(); };
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <a href="/" aria-label="GXA AI Workspace home"><Brand /></a>
      <nav aria-label="Public navigation" className="hidden items-center gap-1 lg:flex">{navigation.map(([label, href]) => <a key={label} href={href} onClick={event => { if (href === '#pricing') { event.preventDefault(); activate(href); } }} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white">{label}</a>)}</nav>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onSearch} aria-label="Search help and documentation" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900"><Search className="h-4 w-4" /></button>
        <button type="button" onClick={onToggleTheme} aria-label={theme === 'light' ? 'Use dark theme' : 'Use light theme'} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
        <div className="hidden items-center gap-2 sm:flex">{isAuthenticated ? <button onClick={onOpenWorkspace} className="theme-primary-action rounded-xl px-4 py-2.5 text-xs font-black">Open Workspace</button> : <><button onClick={onLogin} className="rounded-xl px-3 py-2.5 text-xs font-black">Login</button><button onClick={onRegister} className="theme-primary-action rounded-xl px-4 py-2.5 text-xs font-black">Start Free</button></>}</div>
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="public-mobile-menu" aria-label="Toggle public navigation" className="rounded-xl p-2.5 lg:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
    </div>
    {open && <nav id="public-mobile-menu" aria-label="Mobile public navigation" className="border-t border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"><div className="grid gap-1">{navigation.map(([label, href]) => <a key={label} href={href} onClick={event => { if (href === '#pricing') { event.preventDefault(); onShowPricing(); } setOpen(false); }} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-slate-100 dark:hover:bg-zinc-900">{label}</a>)}<button onClick={onOpenWorkspace} className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-black dark:border-zinc-700">Open Workspace</button>{!isAuthenticated && <><button onClick={onLogin} className="rounded-xl px-4 py-3 text-left text-sm font-black">Login</button><button onClick={onRegister} className="theme-primary-action rounded-xl px-4 py-3 text-left text-sm font-black">Start Free</button></>}</div></nav>}
  </header>;
}

function PublicFooter() {
  return <footer className="border-t border-slate-200 bg-slate-950 text-slate-300 dark:border-zinc-800" aria-label="Website footer"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="grid gap-10 xl:grid-cols-[1.2fr_3fr]"><div><Brand inverse /><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">An integrated AI workspace for writing, documents, business communication and career workflows.</p><a href={`mailto:${COMPANY.supportEmail}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-300 hover:text-teal-200"><Mail className="h-4 w-4" />{COMPANY.supportEmail}</a></div><div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{footerGroups.map(group => <div key={group.title}><h2 className="text-xs font-black uppercase tracking-wider text-white">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={label}><a href={href} className="text-xs text-slate-400 hover:text-white">{label}</a></li>)}</ul></div>)}<div><h2 className="text-xs font-black uppercase tracking-wider text-white">Social</h2><p className="mt-4 text-xs leading-5 text-slate-400">Verified social channels are coming soon.</p></div></div></div><div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} GXA Technologies. All rights reserved.</p><p>GXA AI Workspace · Human review remains essential for AI output.</p></div></div></footer>;
}

function HomePage({ onRegister, onShowPricing, onOpenWorkspace }: Pick<Props, 'onRegister' | 'onShowPricing' | 'onOpenWorkspace'>) {
  const features = featureRoutes.map(route => toolRegistry.find(tool => tool.route === route)).filter(Boolean);
  return <main id="public-main">
    <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.16),_transparent_42%)] dark:border-zinc-800"><div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8"><div><p className="text-xs font-black uppercase tracking-[.22em] text-teal-700 dark:text-teal-300">One workspace for focused AI-assisted work</p><h1 className="mt-5 max-w-4xl font-display text-4xl font-black leading-tight tracking-tight sm:text-6xl">Write, understand documents and move professional work forward.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-zinc-300">GXA AI Workspace brings writing tools, AI chat, document intelligence, translation, business workflows and career tools into one reviewable workspace for individuals and professionals.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={onRegister} className="theme-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black">Start Free<ArrowRight className="h-4 w-4" /></button><button onClick={onShowPricing} className="theme-secondary-action min-h-12 rounded-xl border px-6 text-sm font-black">View Pricing</button><button onClick={onOpenWorkspace} className="min-h-12 rounded-xl px-5 text-sm font-bold text-slate-600 dark:text-zinc-300">Open Guest Workspace</button></div><ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 dark:text-zinc-400"><li className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" />Approved free tools</li><li className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" />Server-controlled plan access</li><li className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" />No payment required to start</li></ul></div><div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-zinc-800 dark:bg-zinc-900"><div className="rounded-2xl bg-slate-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-wider text-teal-300">Built for real workflows</p><h2 className="mt-3 text-2xl font-black">Move content between specialized tools.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Draft with AI Writer, review grammar, preserve meaning while paraphrasing, translate, summarize or organize the result in an authenticated workspace.</p></div><div className="mt-4 grid grid-cols-2 gap-3">{features.slice(0, 4).map(tool => <div key={tool!.id} className="rounded-xl border border-slate-200 p-4 dark:border-zinc-700"><p className="text-sm font-black">{tool!.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{tool!.description}</p></div>)}</div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" aria-labelledby="features-title"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700 dark:text-teal-300">Capabilities</p><h2 id="features-title" className="mt-3 text-3xl font-black sm:text-4xl">The right workspace for each part of the job</h2><p className="mt-4 text-slate-600 dark:text-zinc-300">Each tool has a focused purpose, clear plan access and backend-controlled limits.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(tool => { const Icon = featureIcons[tool!.route] || Sparkles; return <a key={tool!.id} href={`/#/${tool!.route}`} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-black">{tool!.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{tool!.description}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-teal-700 dark:text-teal-300">Explore workflow<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></a>; })}</div></section>
    <section className="border-y border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">{[
      ['Writing and communication','Draft, rewrite, improve grammar, translate and summarize while keeping the original content available for review.'],
      ['Business and career','Business Pro adds complete registered Business Studio and Career Studio workflows without removing lower-plan capabilities.'],
      ['Documents and intelligence','Upload supported documents, extract real content and work with page-aware or source-grounded tools where configured.'],
    ].map(([title, body]) => <article key={title}><h2 className="text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">{body}</p></article>)}</div></section>
    <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6"><ShieldCheck className="mx-auto h-10 w-10 text-teal-600" /><h2 className="mt-5 text-3xl font-black">Trust should be clear, not implied.</h2><p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-zinc-300">Review how the application approaches privacy, security, responsible AI, server-side enforcement and future compliance work.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><a href="/trust" className="theme-primary-action rounded-xl px-5 py-3 text-sm font-black">Visit Trust Center</a><a href="/security" className="theme-secondary-action rounded-xl border px-5 py-3 text-sm font-black">Security overview</a></div></section>
  </main>;
}

function ContactPage() {
  const categories = ['General Questions', 'Billing', 'Technical Support', 'Bug Reports', 'Feature Requests', 'Business Enquiries', 'Partnerships', 'Media'];
  return <PageFrame eyebrow="Contact" title="Contact GXA Technologies" description="Email is the primary support method for GXA AI Workspace."><div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 dark:border-teal-900 dark:bg-teal-950/30"><p className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">Support email</p><a className="mt-2 inline-flex items-center gap-2 text-lg font-black text-teal-800 dark:text-teal-200" href={`mailto:${COMPANY.supportEmail}`}><Mail className="h-5 w-5" />{COMPANY.supportEmail}</a><p className="mt-3 text-sm text-teal-900/70 dark:text-teal-200/70">Do not email passwords, API keys, payment card details or other secrets.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map(category => <a key={category} href={`mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(`${category} — GXA AI Workspace`)}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="font-black">{category}</h2><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-zinc-400">Email the relevant context and safe reproduction details.</p></a>)}</div></PageFrame>;
}

function HelpPage({ onSearch }: { onSearch: () => void }) {
  return <PageFrame eyebrow="Support" title="Help Center" description="Search practical guidance or browse by product area."><button onClick={onSearch} className="theme-control flex min-h-14 w-full items-center gap-3 rounded-2xl border px-5 text-left text-sm text-slate-500"><Search className="h-5 w-5" />Search help, documentation and FAQs</button><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{HELP_CATEGORIES.map(category => <a key={category} href={`/faq?category=${encodeURIComponent(category.replace(' (Future)',''))}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="font-black">{category}</h2><p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Browse verified {category.toLowerCase()} guidance.</p></a>)}</div><div className="mt-10 rounded-2xl bg-slate-950 p-6 text-white"><h2 className="text-xl font-black">Still need help?</h2><p className="mt-2 text-sm text-slate-300">Email support with the affected route, safe error message and steps to reproduce.</p><a href={`mailto:${COMPANY.supportEmail}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-300"><Mail className="h-4 w-4" />{COMPANY.supportEmail}</a></div></PageFrame>;
}

function FaqPage() {
  const [category, setCategory] = useState(() => typeof window === 'undefined' ? 'All' : new URLSearchParams(window.location.search).get('category') || 'All');
  const categories = ['All', ...Array.from(new Set(PUBLIC_FAQS.map(item => item.category)))];
  const visible = category === 'All' ? PUBLIC_FAQS : PUBLIC_FAQS.filter(item => item.category === category);
  return <PageFrame eyebrow="Questions and answers" title="Frequently Asked Questions" description={`${PUBLIC_FAQS.length} verified answers about plans, accounts, data, security and product workflows.`}><div className="flex gap-2 overflow-x-auto pb-3" aria-label="FAQ categories">{categories.map(item => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${category === item ? 'bg-teal-700 text-white' : 'theme-secondary-action border'}`}>{item}</button>)}</div><div className="mt-6 space-y-3">{visible.map(item => <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><summary className="cursor-pointer list-none pr-8 font-black focus-visible:outline-none">{item.question}</summary><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-300">{item.answer}</p></details>)}</div></PageFrame>;
}

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main id="public-main" className="mx-auto min-h-[60vh] max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"><nav aria-label="Breadcrumb" className="text-xs font-bold text-slate-500"><a href="/" className="hover:text-teal-700">Home</a><span aria-hidden="true" className="mx-2">/</span><span>{title}</span></nav><header className="mt-8 max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700 dark:text-teal-300">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 text-lg leading-8 text-slate-600 dark:text-zinc-300">{description}</p></header><div className="mt-10">{children}</div></main>;
}

function InfoPage({ page }: { page: PublicPageDefinition }) {
  return <PageFrame eyebrow={page.eyebrow} title={page.title} description={page.description}><div className="grid gap-5 lg:grid-cols-2">{page.sections.map(section => <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-xl font-black">{section.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">{section.body}</p>{section.items && <ul className="mt-4 space-y-2">{section.items.map(item => <li key={item} className="flex gap-2 text-sm text-slate-600 dark:text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{item}</li>)}</ul>}</section>)}</div></PageFrame>;
}

function NotFoundPage() {
  return <PageFrame eyebrow="404" title="Page not found" description="The requested public page does not exist or may have moved."><div className="flex flex-wrap gap-3"><a href="/" className="theme-primary-action rounded-xl px-5 py-3 text-sm font-black">Return home</a><a href="/help" className="theme-secondary-action rounded-xl border px-5 py-3 text-sm font-black">Open Help Center</a></div></PageFrame>;
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(''); const input = useRef<HTMLInputElement>(null); const dialog = useRef<HTMLElement>(null);
  useEffect(() => { if (!open) return; const previous = document.activeElement as HTMLElement | null; setTimeout(() => input.current?.focus(), 0); const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); return; } if (event.key !== 'Tab' || !dialog.current) return; const controls = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])')); if (!controls.length) return; const first = controls[0]; const last = controls.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }; document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); previous?.focus(); }; }, [open, onClose]);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase(); if (!needle) return [];
    const pages = Object.values(PUBLIC_PAGES).filter(page => `${page.title} ${page.description} ${page.sections.map(section => `${section.title} ${section.body}`).join(' ')}`.toLowerCase().includes(needle)).map(page => ({ title: page.title, text: page.description, href: page.path, type: 'Page' }));
    const faqs = PUBLIC_FAQS.filter(item => `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(needle)).slice(0, 8).map(item => ({ title: item.question, text: item.answer, href: `/faq?category=${encodeURIComponent(item.category)}`, type: 'FAQ' }));
    return [...pages, ...faqs].slice(0, 12);
  }, [query]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-4 pt-[8vh] backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="public-search-title" className="theme-popover max-h-[84vh] w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-zinc-800"><div><h2 id="public-search-title" className="font-black">Search help and documentation</h2><p className="mt-1 text-xs text-slate-500">Search verified public product information.</p></div><button onClick={onClose} aria-label="Close search" className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button></header><div className="p-5"><label className="sr-only" htmlFor="public-search-input">Search</label><div className="theme-control flex items-center gap-3 rounded-xl border px-4"><Search className="h-5 w-5 text-slate-400" /><input ref={input} id="public-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search plans, security, documents…" className="min-h-12 w-full bg-transparent text-sm outline-none" /></div><div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto" aria-live="polite">{query && !results.length && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">No matching public guidance. Contact support if you still need help.</p>}{results.map(result => <a key={`${result.type}-${result.title}`} href={result.href} className="block rounded-xl border border-slate-200 p-4 hover:border-teal-500 dark:border-zinc-700"><span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">{result.type}</span><h3 className="mt-1 text-sm font-black">{result.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-zinc-400">{result.text}</p></a>)}</div></div></section></div>;
}

export default function PublicSite(props: Props) {
  const [path, setPath] = useState(props.initialPath || (() => typeof window === 'undefined' ? '/' : window.location.pathname));
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => { if (props.initialPath) return; const sync = () => setPath(window.location.pathname); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, [props.initialPath]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const page = path === '/' ? undefined : PAGE_BY_PATH.get(path);
  const customSeo: Partial<Record<string, PublicPageDefinition>> = {
    '/': { key: 'home', path: '/', title: 'GXA AI Workspace', eyebrow: 'Home', description: 'An integrated AI workspace for writing, documents, business communication and career workflows.', sections: [] },
    '/contact': { key: 'error', path: '/contact', title: 'Contact GXA Technologies', eyebrow: 'Contact', description: `Contact ${COMPANY.name} support by email for product, billing, technical and business enquiries.`, sections: [] },
    '/help': { key: 'error', path: '/help', title: 'Help Center', eyebrow: 'Support', description: 'Search verified guidance for GXA AI Workspace accounts, plans, tools, security and troubleshooting.', sections: [] },
    '/faq': { key: 'error', path: '/faq', title: 'Frequently Asked Questions', eyebrow: 'FAQ', description: 'Verified answers about GXA AI Workspace plans, accounts, data, AI and product workflows.', sections: [] },
  };
  const seoPage = customSeo[path] || page;
  usePublicSeo(path, seoPage);
  const content = path === '/' ? <HomePage onRegister={props.onRegister} onShowPricing={props.onShowPricing} onOpenWorkspace={props.onOpenWorkspace} /> : path === '/contact' ? <ContactPage /> : path === '/help' ? <HelpPage onSearch={() => setSearchOpen(true)} /> : path === '/faq' ? <FaqPage /> : page ? <InfoPage page={page} /> : <NotFoundPage />;
  return <div className="theme-page min-h-screen font-sans"><a href="#public-main" className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Skip to main content</a><PublicHeader {...props} onSearch={() => setSearchOpen(true)} />{!online && <a href="/offline" role="status" className="block bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-900">You are offline. Your unsaved input may still be in the current browser tab.</a>}{content}<PublicFooter /><SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} /></div>;
}
