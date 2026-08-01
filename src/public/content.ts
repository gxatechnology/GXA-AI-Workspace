export const COMPANY = {
  name: 'GXA Technologies',
  product: 'GXA AI Workspace',
  supportEmail: 'support@gxatechnologies.com',
  productionUrl: 'https://gxa-ai-workspace.vercel.app',
} as const;

export type PublicPageKey =
  | 'home' | 'about' | 'contact' | 'help' | 'faq' | 'docs' | 'resources'
  | 'trust' | 'security' | 'privacy' | 'terms' | 'refund' | 'cancellation'
  | 'cookies' | 'ai-usage' | 'responsible-ai' | 'careers' | 'status'
  | 'release-notes' | 'changelog' | 'offline' | 'maintenance' | 'error';

export interface PublicSection {
  title: string;
  body: string;
  items?: string[];
}

export interface PublicPageDefinition {
  key: PublicPageKey;
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  sections: PublicSection[];
}

export const PUBLIC_PATHS: Record<PublicPageKey, string> = {
  home: '/', about: '/about', contact: '/contact', help: '/help', faq: '/faq', docs: '/docs', resources: '/resources',
  trust: '/trust', security: '/security', privacy: '/privacy', terms: '/terms', refund: '/refund-policy', cancellation: '/cancellation-policy',
  cookies: '/cookie-policy', 'ai-usage': '/ai-usage-policy', 'responsible-ai': '/responsible-ai', careers: '/careers', status: '/status',
  'release-notes': '/release-notes', changelog: '/changelog', offline: '/offline', maintenance: '/maintenance', error: '/error',
};

export const isPublicWebsitePath = (pathname: string, hash = '') =>
  pathname === '/' ? !hash.startsWith('#/') : !pathname.startsWith('/admin') && !pathname.startsWith('/api/');

const reviewNotice = 'This page is a product information resource, not legal advice. Review the latest published version and contact support if you need clarification.';

export const PUBLIC_PAGES: Record<Exclude<PublicPageKey, 'home' | 'help' | 'faq' | 'contact'>, PublicPageDefinition> = {
  about: {
    key: 'about', path: '/about', title: 'About GXA AI Workspace', eyebrow: 'About',
    description: 'A technology-first workspace from GXA Technologies for writing, documents, business communication and career workflows.',
    sections: [
      { title: 'Mission', body: 'Make practical AI-assisted work easier to organize, review and complete in one coherent workspace while keeping people in control of final decisions.' },
      { title: 'Vision', body: 'Build a dependable workspace where individuals and professionals can move between writing, document and specialist workflows without fragmented tools or fabricated claims.' },
      { title: 'What GXA Technologies builds', body: 'GXA Technologies builds GXA AI Workspace: a web application combining writing assistance, AI chat, document intelligence, translation, business workflows and career tools.' },
      { title: 'Why the workspace exists', body: 'The product brings related tools, projects, documents and saved outputs into a single interface so work can move between specialized workflows with less repetition.' },
      { title: 'Technology-first philosophy', body: 'Product capabilities are backed by server-controlled configuration, validated requests, plan enforcement and provider abstractions. Features are presented only when the supporting workflow exists.' },
      { title: 'Responsible innovation', body: 'AI output should remain reviewable. The product avoids presenting probabilistic detection as certainty, prohibits fabricated sources in supported workflows and provides clear limitations for sensitive tasks.' },
      { title: 'Privacy and security', body: 'Authentication, access control, server-side provider routing and durable persistence are designed as backend responsibilities. Public trust information explains what is active and what remains future work.' },
    ],
  },
  docs: {
    key: 'docs', path: '/docs', title: 'Documentation', eyebrow: 'Product documentation',
    description: 'Start with the workspace, understand core workflows and find the right place for projects, documents and AI tools.',
    sections: [
      { title: 'Getting Started', body: 'Open the workspace, choose a tool, enter your own content and review the result before saving or exporting. Guest access is available for approved free workflows.' },
      { title: 'Projects', body: 'Authenticated users can organize related work into projects. Project visibility and access are resolved for the signed-in workspace.' },
      { title: 'Documents', body: 'Create, save and reopen documents from your authenticated workspace. Supported limits are determined by the active server plan.' },
      { title: 'AI Tools', body: 'Use AI Chat, AI Writer, Grammar Checker, Paraphraser, Summarizer and other registered tools. AI requests travel through the GXA backend rather than directly from the browser.' },
      { title: 'Writing workflows', body: 'Move content between writing, grammar, humanizing and translation tools. Always review generated text for accuracy and suitability.' },
      { title: 'Business Studio', body: 'Business Pro unlocks registered email, marketing, social, commerce, proposal, report, operations and planning workflows.' },
      { title: 'Career Studio', body: 'Business Pro unlocks Resume Builder, Resume Import, ATS Guidance, Cover Letter, Career Profile, LinkedIn and interview workflows.' },
      { title: 'Keyboard and accessibility', body: 'Use Tab and Shift+Tab to move through controls, Enter or Space to activate buttons, and Escape to close supported dialogs and menus.' },
      { title: 'Limits', body: 'Input, generation, project, document, storage and history limits come from server plan configuration. The workspace preserves entered content when a plan limit is reached.' },
      { title: 'Export and import', body: 'Available formats depend on the active tool and plan. Import only supported file types and review extracted content before using it in an AI workflow.' },
    ],
  },
  resources: {
    key: 'resources', path: '/resources', title: 'Resources', eyebrow: 'Learn and explore',
    description: 'Verified product guidance, support routes and trust information for GXA AI Workspace.',
    sections: [
      { title: 'Product documentation', body: 'Use the documentation index for workspace, projects, documents, writing and import/export guidance.' },
      { title: 'Help Center', body: 'Search practical help by account, billing, plans, tools, troubleshooting and security.' },
      { title: 'Trust and policies', body: 'Review security, privacy, responsible AI and product policy information before using the workspace for important content.' },
      { title: 'Release information', body: 'Public release notes and a detailed changelog are being prepared. Contact support for questions about current availability.' },
    ],
  },
  trust: {
    key: 'trust', path: '/trust', title: 'Trust Center', eyebrow: 'Trust foundation',
    description: 'A clear view of privacy, security, responsible AI, availability and future compliance work.',
    sections: [
      { title: 'Privacy', body: 'Workspace content and account data are handled by backend services configured for the deployment. The application does not require browser-exposed AI provider secrets.' },
      { title: 'Responsible AI', body: 'Generated content requires human review. Detection is probabilistic, external sources are not invented and sensitive outputs must not be treated as professional advice.' },
      { title: 'Security', body: 'Passwords are hashed, sessions use server-controlled credentials, access checks run on the backend and payment activation requires server verification when payments are configured.' },
      { title: 'Data processing', body: 'User input is sent to backend services needed to perform the selected workflow. Provider routing and model selection are server controlled.' },
      { title: 'Encryption', body: 'Production traffic should use HTTPS. Database and infrastructure encryption depend on the configured hosting and persistence providers; contact support for deployment-specific details.' },
      { title: 'Availability and reliability', body: 'Public pricing remains available independently of durable account storage. Temporary fallbacks keep public routes online, while durable account features require configured PostgreSQL.' },
      { title: 'Compliance', body: 'No certification is claimed on this site. Compliance requirements should be evaluated for each organization and deployment.' },
      { title: 'Future certifications', body: 'Certification work may be considered as the platform matures. Any achieved certification will be published here only after verification.' },
    ],
  },
  security: {
    key: 'security', path: '/security', title: 'Security at GXA AI Workspace', eyebrow: 'Security',
    description: 'Current technical safeguards, clear boundaries and future security capabilities.',
    sections: [
      { title: 'Authentication', body: 'Passwords are stored as secure hashes rather than plain text. Sessions are represented by server-validated credentials and can be revoked.' },
      { title: 'Access control', body: 'Authenticated data is scoped to a user or authorized workspace. Protected administration and organization actions require backend permission checks.' },
      { title: 'Server verification', body: 'Plans, entitlements, AI models, provider selection and payment activation are verified on the server. Frontend values are not treated as authority.' },
      { title: 'Secure payments', body: 'When Razorpay is configured, payment status must pass backend signature and checkout verification before subscription activation. Checkout is unavailable when durable billing storage is absent.' },
      { title: 'Encryption', body: 'Use the production site over HTTPS. Infrastructure-level encryption depends on the configured hosting, database and provider services.' },
      { title: 'Future MFA', body: 'Multi-factor authentication is architecture-ready but is not currently advertised as an active user feature.' },
      { title: 'Future audit controls', body: 'Internal audit records support protected operations. Expanded customer-facing audit capabilities remain future work.' },
      { title: 'Future API security', body: 'API and webhook architecture includes scoped credentials and signature validation, but public developer access should be treated as future availability unless explicitly enabled.' },
      { title: 'Report a security concern', body: `Send a concise report to ${COMPANY.supportEmail}. Do not include passwords, API keys or other secrets in email.` },
    ],
  },
  privacy: {
    key: 'privacy', path: '/privacy', title: 'Privacy Policy', eyebrow: 'Legal and privacy',
    description: 'How GXA AI Workspace approaches account, workspace and service data.',
    sections: [
      { title: 'Scope', body: `This policy describes the GXA AI Workspace product operated by ${COMPANY.name}. ${reviewNotice}` },
      { title: 'Information you provide', body: 'Account registration may include name and email. Profile settings may include avatar, phone, company, timezone and language when supplied by the user.' },
      { title: 'Workspace content', body: 'Projects, documents, prompts, AI conversations and generated outputs may be stored for authenticated users when durable persistence is configured.' },
      { title: 'Service information', body: 'The backend may process request status, tool name, safe usage counts, latency and tenant identifiers needed for reliability, limits and security. Complete prompts and outputs should not be used as general-purpose application logs.' },
      { title: 'How information is used', body: 'Information is used to authenticate users, provide requested features, enforce limits, preserve saved work, secure the service and respond to support requests.' },
      { title: 'AI processing', body: 'Content submitted to AI tools is routed through the GXA backend to an enabled provider according to server configuration. Do not submit information you are not authorized to process.' },
      { title: 'Retention and deletion', body: 'Retention depends on the active plan, account state and configured infrastructure. Account deletion and data export requests are subject to identity, ownership and retention checks.' },
      { title: 'Contact', body: `Privacy questions can be sent to ${COMPANY.supportEmail}.` },
    ],
  },
  terms: {
    key: 'terms', path: '/terms', title: 'Terms of Service', eyebrow: 'Legal',
    description: 'General product terms for responsible use of GXA AI Workspace.',
    sections: [
      { title: 'Agreement and review', body: `By using the service, users agree to follow the current product terms and applicable law. ${reviewNotice}` },
      { title: 'Accounts', body: 'Users are responsible for accurate registration information, safeguarding access and activity performed through their account.' },
      { title: 'Permitted use', body: 'Use the workspace only for content and data you are authorized to process. Do not misuse the service to harm others, bypass access controls or generate unlawful material.' },
      { title: 'AI output', body: 'AI output may be incomplete or incorrect and must be reviewed. The service does not replace qualified legal, medical, financial, employment or other professional advice.' },
      { title: 'Plans and limits', body: 'Feature access and limits are determined by the server plan registry. Reaching a limit may pause the relevant action until the limit resets or the plan changes.' },
      { title: 'Availability', body: 'The service may change, experience interruption or place a feature into maintenance. Future features are not guaranteed until published as available.' },
      { title: 'Contact', body: `Questions about these terms can be sent to ${COMPANY.supportEmail}.` },
    ],
  },
  refund: {
    key: 'refund', path: '/refund-policy', title: 'Refund Policy', eyebrow: 'Billing policy',
    description: 'How refund questions will be handled when paid checkout is enabled.',
    sections: [
      { title: 'Current payment availability', body: 'Paid checkout is available only when Razorpay and durable billing storage are configured. This page does not claim that payment is active on every deployment.' },
      { title: 'Requesting a review', body: `For a billing concern, email ${COMPANY.supportEmail} from the account email and include the plan, transaction reference and a concise explanation. Never send card details or passwords.` },
      { title: 'Eligibility review', body: 'Refund eligibility depends on the transaction status, service access, applicable law and the published terms in effect at the time of purchase. No automatic approval is promised.' },
      { title: 'Processing', body: 'Approved refunds are returned through the supported payment process. Timing depends on the payment provider and financial institution.' },
      { title: 'Policy review', body: reviewNotice },
    ],
  },
  cancellation: {
    key: 'cancellation', path: '/cancellation-policy', title: 'Cancellation Policy', eyebrow: 'Billing policy',
    description: 'Plan cancellation and access expectations when subscription management is enabled.',
    sections: [
      { title: 'Managing a subscription', body: 'Eligible paid users can use the account plan area when subscription management is configured. Contact support if the control is unavailable.' },
      { title: 'Access after cancellation', body: 'A verified cancellation may remain active until the confirmed paid period ends. The server remains authoritative for subscription status and access dates.' },
      { title: 'Saved work', body: 'Projects and documents are not intentionally erased merely because a plan changes. Access and retention remain subject to account state, plan limits and applicable policy.' },
      { title: 'Assistance', body: `Send cancellation questions to ${COMPANY.supportEmail}. Do not send payment credentials.` },
      { title: 'Policy review', body: reviewNotice },
    ],
  },
  cookies: {
    key: 'cookies', path: '/cookie-policy', title: 'Cookie Policy', eyebrow: 'Privacy',
    description: 'Essential browser storage used by the current application.',
    sections: [
      { title: 'Essential sessions', body: 'The application uses an HttpOnly session cookie to maintain authenticated access. A temporary plan-selection cookie may preserve a selected upgrade path.' },
      { title: 'Preferences', body: 'Theme preference and limited application state may be stored in browser local storage. These preferences are not payment or subscription authority.' },
      { title: 'Analytics', body: 'This phase does not add third-party analytics or advertising cookies.' },
      { title: 'Controls', body: 'Blocking essential cookies may prevent login or plan-selection continuity. Browser storage can be cleared through browser settings.' },
      { title: 'Policy review', body: reviewNotice },
    ],
  },
  'ai-usage': {
    key: 'ai-usage', path: '/ai-usage-policy', title: 'AI Usage Policy', eyebrow: 'Responsible use',
    description: 'Rules and expectations for responsible use of AI-assisted workflows.',
    sections: [
      { title: 'Human review', body: 'Review generated output before publishing, submitting or relying on it. Users remain responsible for final content and decisions.' },
      { title: 'Authorized content', body: 'Submit only information you have permission to process. Avoid unnecessary personal, confidential or regulated data.' },
      { title: 'Prohibited misuse', body: 'Do not use the service for fraud, impersonation, harassment, malware, access-control bypass, fabricated evidence or unlawful discrimination.' },
      { title: 'Accuracy and sources', body: 'Do not present generated statements, citations, matches or detection results as verified facts without independent review.' },
      { title: 'Sensitive decisions', body: 'Do not use AI output as the sole basis for employment, legal, medical, financial or other high-impact decisions.' },
      { title: 'Enforcement', body: 'Requests may be rejected or access limited when needed to protect the service, users or legal compliance.' },
      { title: 'Policy review', body: reviewNotice },
    ],
  },
  'responsible-ai': {
    key: 'responsible-ai', path: '/responsible-ai', title: 'Responsible AI', eyebrow: 'Product principles',
    description: 'How GXA AI Workspace keeps AI assistance reviewable, bounded and transparent.',
    sections: [
      { title: 'People remain responsible', body: 'AI assists with drafting, analysis and transformation. People must review context, accuracy, tone and consequences.' },
      { title: 'Grounding over invention', body: 'Document, summarization, grammar and business workflows instruct providers to preserve supplied facts and avoid fabricated sources, claims or outcomes.' },
      { title: 'Probabilistic detection', body: 'AI detection results describe stylistic signals and limitations. They do not prove authorship or misconduct.' },
      { title: 'Meaning preservation', body: 'Paraphrasing, translation and humanizing workflows are designed to preserve names, numbers, URLs, protected terms and user meaning where applicable.' },
      { title: 'Server-controlled providers', body: 'Provider and model access are resolved on the backend. Provider secrets are not sent to the browser.' },
      { title: 'Report a concern', body: `Send product-safety concerns to ${COMPANY.supportEmail} with enough non-sensitive context to investigate.` },
    ],
  },
  careers: {
    key: 'careers', path: '/careers', title: 'Careers at GXA Technologies', eyebrow: 'Careers',
    description: 'Information about future opportunities connected to GXA AI Workspace.',
    sections: [
      { title: 'Current openings', body: 'A verified public vacancies list is not available at this time. Open roles will be published here when confirmed.' },
      { title: 'Future opportunities', body: 'Future work may span product engineering, AI safety, design, security, support and platform operations.' },
      { title: 'Contact', body: `For a genuine career enquiry, contact ${COMPANY.supportEmail}. Do not send government identification, financial information or other sensitive documents unless a verified process requests them.` },
    ],
  },
  status: {
    key: 'status', path: '/status', title: 'System Status', eyebrow: 'Future-ready status',
    description: 'A public service-status experience is being prepared.',
    sections: [
      { title: 'Current status reporting', body: 'Automated public uptime and incident reporting is coming soon. No uptime percentage or incident history is claimed on this page.' },
      { title: 'Need help now?', body: `If a feature appears unavailable, retry once and contact ${COMPANY.supportEmail} with the affected route, time and safe error message.` },
      { title: 'Planned coverage', body: 'Future status reporting may cover the public website, authentication, workspace APIs, AI generation and document processing after reliable monitors are configured.' },
    ],
  },
  'release-notes': {
    key: 'release-notes', path: '/release-notes', title: 'Release Notes', eyebrow: 'Product updates',
    description: 'Verified public release summaries will be published here.',
    sections: [
      { title: 'Public notes coming soon', body: 'A verified release-note feed is not currently available. This page intentionally avoids creating fictional dates, versions or feature announcements.' },
      { title: 'Questions about availability', body: `Contact ${COMPANY.supportEmail} for clarification about a currently visible product capability.` },
    ],
  },
  changelog: {
    key: 'changelog', path: '/changelog', title: 'Changelog', eyebrow: 'Technical changes',
    description: 'A structured public changelog is being prepared.',
    sections: [
      { title: 'Coming soon', body: 'Public technical entries will appear after a verified release process is connected. No fabricated version history is shown.' },
      { title: 'Product support', body: `For a regression or unexpected behavior, email ${COMPANY.supportEmail} with reproduction steps that do not contain secrets.` },
    ],
  },
  offline: {
    key: 'offline', path: '/offline', title: 'You appear to be offline', eyebrow: 'Connection unavailable',
    description: 'Your browser cannot currently reach GXA AI Workspace.',
    sections: [
      { title: 'Your input', body: 'Do not refresh a tool that contains unsaved input. Reconnect first, then retry the action.' },
      { title: 'Next steps', body: 'Check your connection, disable an incorrect offline mode and try again. If the service remains unavailable after reconnecting, contact support.' },
    ],
  },
  maintenance: {
    key: 'maintenance', path: '/maintenance', title: 'Scheduled maintenance', eyebrow: 'Maintenance',
    description: 'This page is ready for a confirmed maintenance window.',
    sections: [
      { title: 'No active notice', body: 'No verified maintenance window is published here right now. If maintenance is scheduled, confirmed timing and affected services will replace this message.' },
      { title: 'Support', body: `Contact ${COMPANY.supportEmail} if you cannot access a required feature.` },
    ],
  },
  error: {
    key: 'error', path: '/error', title: 'Something went wrong', eyebrow: 'Server error',
    description: 'The requested page could not be completed safely.',
    sections: [
      { title: 'Your work', body: 'Avoid clearing or replacing any unsaved input. Return to the workspace and retry once.' },
      { title: 'Still blocked?', body: `Contact ${COMPANY.supportEmail} with the route, approximate time and safe error message. Never include passwords or API keys.` },
    ],
  },
};

export interface PublicFaq { category: string; question: string; answer: string }

export const PUBLIC_FAQS: PublicFaq[] = [
  ['Plans','Can I use GXA AI Workspace for free?','Yes. The Free plan provides approved core tools and server-configured limits.'],
  ['Plans','Which public plans are available?','The public registry currently lists Free, Starter, Pro and Business Pro.'],
  ['Plans','Does Business Pro include lower-plan features?','Yes. Business Pro is the cumulative individual plan and includes Free, Starter and Pro entitlements.'],
  ['Plans','Which plan includes Business Studio?','Business Studio is available only with Business Pro.'],
  ['Plans','Which plan includes Career Studio?','Career Studio is available only with Business Pro.'],
  ['Plans','Where are plan limits defined?','Plans and limits come from the centralized server registry, not browser-controlled values.'],
  ['Billing','Is yearly billing available?','Yearly billing is marked as coming later and no annual price is currently advertised.'],
  ['Billing','Is Razorpay always active?','No. Checkout is available only when Razorpay and durable billing storage are configured.'],
  ['Billing','How is payment activation verified?','When enabled, the backend verifies the checkout, amount, signature and subscription details before activation.'],
  ['Billing','Can I view pricing without signing in?','Yes. Public plan definitions and comparisons are available to logged-out visitors.'],
  ['Refunds','How do I ask about a refund?','Email support from the account email with the transaction reference and a concise explanation. Do not send card details.'],
  ['Cancellation','Can I cancel a paid plan?','Use subscription management when available or contact support. Verified cancellation timing is controlled by the backend subscription record.'],
  ['Cancellation','Will cancellation immediately delete my projects?','Plan changes do not intentionally erase saved work. Retention and access remain subject to account and plan policy.'],
  ['Account','Do I need an account for every tool?','No. Approved guest tools work within free limits; saving and account-specific history require authentication.'],
  ['Account','How do I create an account?','Choose Start Free or Register, provide the required information and follow the account flow.'],
  ['Login','Why am I being asked to sign in?','Projects, saved documents, history and other personal workspace features need an authenticated owner.'],
  ['Password','Are passwords stored as plain text?','No. The backend stores password hashes rather than plain passwords.'],
  ['Password','How do I reset a forgotten password?','Use Forgot Password on the login page. If the account exists, the configured delivery flow provides a time-limited reset link.'],
  ['Password','What should I do after a suspicious login?','Change the password, review active sessions where available and contact support with non-sensitive details.'],
  ['Data','Where is authenticated workspace data stored?','Durable deployments use configured PostgreSQL persistence. Temporary memory mode is not durable account storage.'],
  ['Data','Does my work survive a page refresh?','Saved authenticated data reloads from durable persistence. Unsaved editor input depends on the tool and should be saved before leaving.'],
  ['Data','Can I request a data export?','The account architecture includes protected export requests. Availability depends on the configured deployment and account controls.'],
  ['Privacy','Does the browser receive AI provider keys?','No. Provider credentials are read and used by backend adapters.'],
  ['Privacy','Should I submit confidential information?','Submit only information you are authorized to process and avoid unnecessary sensitive data.'],
  ['Privacy','How do I ask a privacy question?','Email support@gxatechnologies.com without including passwords or secrets.'],
  ['Security','Are plan gates enforced only in the interface?','No. Protected access and entitlements are enforced on the server.'],
  ['Security','Does the application support MFA?','MFA is future-ready but is not currently advertised as an active user feature.'],
  ['Security','How do I report a security issue?','Email support with clear reproduction information and no credentials or live secrets.'],
  ['AI','Can AI output contain mistakes?','Yes. Review all generated output for facts, context, tone and suitability.'],
  ['AI','Is AI detection guaranteed?','No. Detection reports probabilistic stylistic signals and limitations, not proof of authorship.'],
  ['AI','Can the service invent citations?','Supported prompts prohibit invented citations, but users must still verify every source before relying on it.'],
  ['AI','Are models selected by the browser?','No. Tool routes and approved models are resolved by backend configuration.'],
  ['AI','Can I stop a streaming response?','AI Chat supports cancellation where the active backend streaming flow provides it.'],
  ['Projects','Who can see my personal projects?','Project access is scoped to the authenticated owner or an authorized workspace context.'],
  ['Projects','Why can’t a guest save a project?','A project needs a durable authenticated owner so it can be reopened safely.'],
  ['Documents','Which documents can I upload?','Supported file types and size/page limits are provided by the active document configuration and plan.'],
  ['Documents','Are sample documents preloaded?','Production document workspaces should begin with clean states rather than fake user files.'],
  ['Documents','Will an upload create a public file URL?','Private file handling should not expose direct private paths or insecure permanent URLs.'],
  ['Writing','What does the Paraphraser preserve?','It is designed to preserve meaning and configured names, numbers, technical terms and protected words.'],
  ['Writing','What can Grammar Checker review?','It can review supported grammar, spelling, punctuation, clarity and style categories within configured access.'],
  ['Writing','Can I translate formatted content?','The Translator attempts to preserve names, numbers, URLs, glossary terms and formatting where supported.'],
  ['Writing','Does Summarizer search for outside facts?','Summaries should remain grounded in the supplied input and must not invent citations or document facts.'],
  ['Business Studio','What is included in Business Studio?','The registry includes email, marketing, social, commerce, proposals, reports, operations and planning workflows.'],
  ['Business Studio','Can Pro users access Business Studio?','No. Free, Starter and Pro remain locked; Business Pro is required.'],
  ['Career Studio','What is included in Career Studio?','Career Studio includes Resume Builder, Resume Import, ATS Guidance, Cover Letter, Career Profile, LinkedIn, interview and library workflows.'],
  ['Career Studio','Does ATS Guidance guarantee an interview?','No. It provides evidence-based guidance and does not predict hiring outcomes.'],
  ['Troubleshooting','What should I do when generation fails?','Keep the entered content, retry once and contact support if the safe error persists.'],
  ['Troubleshooting','What happens when I reach a plan limit?','The affected action stops and the workspace offers an upgrade path without exposing token or provider-cost details.'],
  ['API','Is a public developer API available?','Developer API access is future availability unless explicitly enabled for the deployment.'],
].map(([category, question, answer]) => ({ category, question, answer }));

export const HELP_CATEGORIES = [
  'Account', 'Billing', 'Plans', 'Projects', 'Documents', 'AI Writing', 'Paraphraser', 'Grammar',
  'Translator', 'Business Studio', 'Career Studio', 'Troubleshooting', 'Security', 'API (Future)',
] as const;

export const PAGE_BY_PATH = new Map(Object.values(PUBLIC_PAGES).map(page => [page.path, page]));
