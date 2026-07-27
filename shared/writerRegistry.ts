export type WriterPlan = 'free' | 'pro' | 'pro_plus';
export type WriterFieldType = 'text' | 'textarea' | 'select' | 'tags' | 'url';
export type WriterOutputType = 'document' | 'outline' | 'email' | 'social' | 'structured';
export type WriterExportFormat = 'txt' | 'md' | 'html';

export interface WriterFieldDefinition {
  id: string;
  label: string;
  type: WriterFieldType;
  placeholder: string;
  description?: string;
  required?: boolean;
  maxLength: number;
  options?: string[];
  defaultValue?: string;
  validationMessage?: string;
}

export interface WriterTemplateDefinition {
  id: string;
  name: string;
  route: string;
  category: string;
  description: string;
  icon: string;
  keywords: string[];
  useCases: string[];
  inputFields: WriterFieldDefinition[];
  outputType: WriterOutputType;
  defaultTone: string;
  supportedTones: string[];
  supportedLanguages: string[];
  supportedLengths: string[];
  guestAccess: boolean;
  requiredPlan: WriterPlan;
  status: 'available' | 'beta';
  featured: boolean;
  popular: boolean;
  isNew: boolean;
  systemInstructionKey: string;
  outputSchema: string;
  previewStructure: string[];
  setupComplexity: 'Quick' | 'Guided' | 'Advanced';
  compatibleExports: WriterExportFormat[];
  legalReviewRequired?: boolean;
}

export const WRITER_LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Italian'] as const;
export const WRITER_LENGTHS = ['short', 'medium', 'long'] as const;
export const WRITER_TONES = ['neutral', 'professional', 'formal', 'friendly', 'casual', 'confident', 'persuasive', 'empathetic', 'informative', 'creative', 'enthusiastic', 'direct'] as const;

const text = (id: string, label: string, placeholder: string, required = false, maxLength = 500, description?: string): WriterFieldDefinition => ({
  id, label, type: 'text', placeholder, required, maxLength, description,
  validationMessage: required ? `${label} is required.` : undefined,
});
const area = (id: string, label: string, placeholder: string, required = false, maxLength = 5000, description?: string): WriterFieldDefinition => ({
  id, label, type: 'textarea', placeholder, required, maxLength, description,
  validationMessage: required ? `${label} is required.` : undefined,
});
const tags = (id: string, label: string, placeholder: string, maxLength = 700): WriterFieldDefinition => ({ id, label, type: 'tags', placeholder, maxLength, description: 'Separate terms with commas.' });
const select = (id: string, label: string, options: string[], required = false, defaultValue = ''): WriterFieldDefinition => ({
  id, label, type: 'select', placeholder: '', options, required, defaultValue, maxLength: 100,
  validationMessage: required ? `Choose ${label.toLowerCase()}.` : undefined,
});

const writingInstructions = area('topic', 'Writing instructions', 'Describe exactly what you want to create.', true, 5000, 'Include the subject, context, and any facts the draft must use.');
const targetAudience = text('audienceDetails', 'Target audience', 'Who will read this?', true, 300);
const goal = text('goal', 'Goal', 'What should this content achieve?', true, 400);
const keyPoints = area('keyPoints', 'Key points', 'Add facts, requirements, examples, or points to include.', false, 4000);
const sourceNotes = area('sourceNotes', 'Source notes', 'Paste verified facts or references. Missing evidence will be marked, not invented.', false, 6000);
const keywordField = tags('keywords', 'Keywords', 'keyword one, keyword two');
const callToAction = text('callToAction', 'Call to action', 'What should the reader do next?', false, 300);
const product = area('product', 'Product or service', 'Describe the offer, differentiators, and verified product facts.', true, 3000);
const offer = text('offer', 'Offer', 'Describe the price, promotion, or value proposition using verified details.', true, 500);
const platform = select('platform', 'Platform', ['LinkedIn', 'Instagram', 'Facebook', 'X', 'Threads', 'YouTube', 'Pinterest', 'Google Business Profile', 'Other'], true);
const role = area('role', 'Role or opportunity', 'Paste the role details or professional objective.', true, 4000);
const recipientContext = text('recipient', 'Recipient context', 'Recipient role, relationship, or situation.', true, 400);
const purposeDetails = area('purposeDetails', 'Message purpose', 'Explain why you are writing and the outcome you need.', true, 2000);
const companyContext = area('companyContext', 'Company context', 'Add the company, brand, team, and relevant background.', false, 2000);
const proofPoints = area('proofPoints', 'Proof points', 'Add only verified benefits, evidence, specifications, or differentiators.', false, 2500);
const landingContext = text('landingContext', 'Landing-page context', 'Describe the destination page or campaign context.', false, 600);
const genre = select('genre', 'Genre', ['Contemporary', 'Mystery', 'Thriller', 'Romance', 'Science fiction', 'Fantasy', 'Historical', 'Literary', 'Children\'s', 'Other'], true);
const premise = area('premise', 'Story premise', 'Describe the characters, setting, conflict, and intended ending.', true, 4000);
const learningObjective = area('learningObjective', 'Learning objective', 'What should learners understand or be able to do?', true, 1500);
const subjectLevel = text('subjectLevel', 'Subject and level', 'For example: Grade 8 mathematics or undergraduate marketing.', true, 400);
const reportPeriod = text('reportPeriod', 'Reporting period', 'For example: 1–7 July 2026.', true, 160);
const accomplishments = area('accomplishments', 'Progress and outcomes', 'List completed work, results, blockers, and verified metrics.', true, 3000);

const profiles = {
  general: [writingInstructions, targetAudience, keyPoints],
  longform: [writingInstructions, targetAudience, goal, keywordField, keyPoints, sourceNotes, callToAction],
  academic: [writingInstructions, subjectLevel, keyPoints, sourceNotes],
  business: [writingInstructions, targetAudience, goal, keyPoints, callToAction],
  marketing: [product, targetAudience, offer, proofPoints, keywordField, callToAction],
  advertising: [product, targetAudience, offer, landingContext, proofPoints, select('adFormat', 'Ad format', ['Single image', 'Carousel', 'Video', 'Search', 'Display', 'Other'], true)],
  social: [writingInstructions, platform, targetAudience, callToAction, keywordField],
  career: [role, area('experience', 'Relevant experience', 'Add only real skills, achievements, and employment details.', true, 5000), targetAudience],
  email: [recipientContext, purposeDetails, keyPoints, callToAction],
  product: [product, targetAudience, proofPoints, keywordField, callToAction],
  story: [genre, premise, targetAudience, text('characters', 'Characters', 'Names, roles, motivations, and constraints.', false, 1200)],
  education: [subjectLevel, learningObjective, targetAudience, area('sourceMaterial', 'Source material', 'Add the curriculum, notes, or facts the activity must use.', false, 5000)],
  website: [text('businessName', 'Business or organization', 'Who is this page for?', true, 300), product, targetAudience, proofPoints, callToAction],
  seo: [text('pageTopic', 'Page topic', 'Describe the page and search intent.', true, 800), targetAudience, goal, keywordField, sourceNotes],
  hr: [text('roleTitle', 'Role or employee context', 'Job title, department, or employee situation.', true, 500), companyContext, area('requirements', 'Required details', 'Responsibilities, qualifications, dates, or review evidence.', true, 3000)],
  report: [reportPeriod, accomplishments, area('nextSteps', 'Next steps', 'List priorities, owners, and due dates.', false, 2500)],
  script: [writingInstructions, targetAudience, goal, keyPoints, callToAction],
} as const;

interface Seed {
  id: string;
  name: string;
  category: string;
  description: string;
  profile: keyof typeof profiles;
  outputType: WriterOutputType;
  requiredPlan?: WriterPlan;
  featured?: boolean;
  popular?: boolean;
  isNew?: boolean;
  structure?: string[];
  legalReviewRequired?: boolean;
}

const seed = (id: string, name: string, category: string, description: string, profile: keyof typeof profiles, outputType: WriterOutputType, options: Partial<Pick<Seed, 'requiredPlan' | 'featured' | 'popular' | 'isNew' | 'structure' | 'legalReviewRequired'>> = {}): Seed => ({ id, name, category, description, profile, outputType, ...options });

const seeds: Seed[] = [
  seed('ai-writer', 'AI Writer', 'General Writing', 'Create a structured draft from clear instructions.', 'general', 'document', { featured: true, popular: true, structure: ['Title', 'Structured draft', 'Next-step suggestion'] }),
  seed('blog-writer', 'Blog Writer', 'Blog and Article', 'Create an organized blog draft with useful headings.', 'longform', 'document', { featured: true, popular: true, structure: ['SEO-aware title', 'Introduction', 'Headed sections', 'Conclusion'] }),
  seed('article-writer', 'Article Writer', 'Blog and Article', 'Develop a clear analytical article from supplied facts.', 'longform', 'document'),
  seed('blog-outline', 'Blog Outline', 'Blog and Article', 'Plan a useful article before drafting.', 'longform', 'outline'),
  seed('essay-writer', 'Essay Writer', 'Education and Academic', 'Build a reasoned essay without invented citations.', 'academic', 'document'),
  seed('story-writer', 'Story Writer', 'Creative Writing', 'Write an original story from your premise and constraints.', 'story', 'document'),
  seed('book-writer', 'Book Writer', 'Creative Writing', 'Plan chapters, scenes, or a long-form narrative.', 'story', 'outline', { requiredPlan: 'pro' }),
  seed('newsletter', 'Newsletter', 'Email and Communication', 'Create a readable newsletter with sections and a call to action.', 'email', 'email'),
  seed('speech', 'Speech Writer', 'Video and Audio Scripts', 'Draft a paced speech for a defined audience.', 'script', 'document'),
  seed('script', 'Script Writer', 'Video and Audio Scripts', 'Create an audiovisual script with clear beats.', 'script', 'document'),
  seed('research-paper', 'Research Paper', 'Education and Academic', 'Structure research writing around user-provided evidence.', 'academic', 'document', { requiredPlan: 'pro' }),
  seed('academic-abstract', 'Abstract Builder', 'Education and Academic', 'Condense supplied research into an abstract.', 'academic', 'structured'),
  seed('literature-review', 'Literature Review', 'Education and Academic', 'Organize supplied studies without fabricating references.', 'academic', 'document', { requiredPlan: 'pro' }),
  seed('assignment', 'Academic Assignment', 'Education and Academic', 'Create a supported assignment draft or outline.', 'academic', 'document'),
  seed('case-study', 'Case Study', 'Business and Sales', 'Turn verified scenario details into a case study.', 'business', 'document'),
  seed('thesis-gen', 'Thesis Statement', 'Education and Academic', 'Generate focused, arguable thesis options.', 'academic', 'structured'),
  seed('dissertation', 'Dissertation Outline', 'Education and Academic', 'Build a detailed dissertation structure.', 'academic', 'outline', { requiredPlan: 'pro' }),
  seed('citation-builder', 'Citation Builder', 'Education and Academic', 'Format complete reference details supplied by the user.', 'academic', 'structured'),
  seed('biz-proposal', 'Business Proposal', 'Business and Sales', 'Create a persuasive, structured client proposal.', 'business', 'document', { featured: true, popular: true }),
  seed('biz-plan', 'Business Plan', 'Business and Sales', 'Develop a practical business-plan outline.', 'business', 'outline', { requiredPlan: 'pro' }),
  seed('invoice-notes', 'Invoice Descriptions', 'Business and Sales', 'Write clear invoice line descriptions and notes.', 'business', 'structured'),
  seed('meeting-notes', 'Meeting Notes', 'Utility and Productivity', 'Transform supplied notes into decisions and actions.', 'business', 'structured'),
  seed('minutes', 'Minutes of Meeting', 'Utility and Productivity', 'Create formal minutes from supplied meeting facts.', 'business', 'structured'),
  seed('company-profile', 'Company Profile', 'Business and Sales', 'Draft a company profile using verified company details.', 'business', 'document'),
  seed('resume-builder', 'Resume Builder', 'Career and Professional', 'Create truthful, impact-focused resume content.', 'career', 'structured', { featured: true, popular: true }),
  seed('resume-optimizer', 'Resume Optimizer', 'Career and Professional', 'Align supplied resume content to a role without inventing experience.', 'career', 'document', { requiredPlan: 'pro' }),
  seed('cover-letter', 'Cover Letter', 'Career and Professional', 'Write a tailored cover letter from real experience.', 'career', 'email'),
  seed('sop-builder', 'Statement of Purpose', 'Career and Professional', 'Structure a statement of purpose from real achievements.', 'career', 'document'),
  seed('lor-builder', 'Letter of Recommendation', 'Career and Professional', 'Draft a recommendation from supplied evidence.', 'career', 'email', { requiredPlan: 'pro' }),
  seed('landing-page', 'Landing Page Copy', 'SEO and Website Content', 'Create focused landing-page sections and calls to action.', 'website', 'structured', { featured: true, popular: true }),
  seed('sales-copy', 'Sales Copy', 'Marketing and Advertising', 'Create benefit-led sales copy from supplied claims.', 'marketing', 'document'),
  seed('google-ads', 'Google Ads Copy', 'Marketing and Advertising', 'Generate character-aware ad headlines and descriptions.', 'advertising', 'structured', { requiredPlan: 'pro' }),
  seed('seo-article', 'SEO Article', 'SEO and Website Content', 'Create useful keyword-aware content without ranking claims.', 'seo', 'document', { requiredPlan: 'pro' }),
  seed('linkedin-post', 'LinkedIn Post', 'Social Media', 'Write a professional post with an authentic point of view.', 'social', 'social', { featured: true, popular: true }),
  seed('twitter-x', 'X Thread', 'Social Media', 'Create a concise sequence of connected posts.', 'social', 'social'),
  seed('instagram-caption', 'Instagram Caption', 'Social Media', 'Write a platform-aware caption and relevant hashtags.', 'social', 'social'),
  seed('poem', 'Poem Generator', 'Creative Writing', 'Create an original poem from a theme and form.', 'general', 'document'),
  seed('lyrics', 'Lyrics Generator', 'Creative Writing', 'Create original song lyrics without imitating living artists.', 'general', 'document', { requiredPlan: 'pro' }),
  seed('api-doc', 'API Documentation', 'Utility and Productivity', 'Turn supplied endpoint details into Markdown documentation.', 'general', 'document'),
  seed('readme-gen', 'README Builder', 'Utility and Productivity', 'Create a useful README from supplied project facts.', 'general', 'document'),
  seed('prompt-writing', 'Prompt Optimizer', 'Utility and Productivity', 'Improve a prompt while keeping user data separate.', 'general', 'structured'),
  seed('professional-email', 'Professional Email', 'Email and Communication', 'Write a concise professional email.', 'email', 'email'),
  seed('cold-email', 'Cold Email', 'Email and Communication', 'Create responsible outreach from a real offer.', 'email', 'email', { requiredPlan: 'pro' }),
  seed('customer-support-reply', 'Customer Support Reply', 'Email and Communication', 'Draft an empathetic response from supplied case details.', 'email', 'email'),
  seed('meta-description', 'Meta Description', 'SEO and Website Content', 'Create concise page descriptions from supplied content.', 'seo', 'structured'),
  seed('product-description', 'Product Description', 'Product and E-commerce', 'Turn verified product details into useful product copy.', 'product', 'structured'),
  seed('product-faq', 'Product FAQ', 'Product and E-commerce', 'Create FAQs grounded in supplied product information.', 'product', 'structured'),
  seed('youtube-script', 'YouTube Script', 'Video and Audio Scripts', 'Create an organized video script with hook and call to action.', 'script', 'document'),
  seed('podcast-outline', 'Podcast Outline', 'Video and Audio Scripts', 'Plan a podcast episode with segments and prompts.', 'script', 'outline'),
  seed('story-outline', 'Story Outline', 'Creative Writing', 'Plan plot, characters, scenes, and resolution.', 'story', 'outline'),
  seed('formal-application', 'Formal Application', 'Personal Writing', 'Draft a respectful formal application for review.', 'email', 'email', { legalReviewRequired: true }),
  seed('announcement', 'Announcement', 'Personal Writing', 'Create a clear announcement from supplied details.', 'general', 'document'),

  // High-value additions supported by the existing text-generation architecture.
  seed('homepage-copy', 'Homepage Copy', 'SEO and Website Content', 'Draft a clear homepage hierarchy grounded in real business facts.', 'website', 'structured', { isNew: true, featured: true }),
  seed('about-us-page', 'About Us Page', 'SEO and Website Content', 'Tell an accurate company story without invented milestones.', 'website', 'document', { isNew: true }),
  seed('services-page', 'Services Page', 'SEO and Website Content', 'Explain services, outcomes, process, and next steps.', 'website', 'structured', { isNew: true }),
  seed('faq-page', 'FAQ Page', 'SEO and Website Content', 'Create grounded customer questions and answers.', 'website', 'structured', { isNew: true }),
  seed('website-hero', 'Website Hero Copy', 'SEO and Website Content', 'Create concise hero headlines, supporting text, and calls to action.', 'website', 'structured', { isNew: true }),
  seed('seo-content-brief', 'SEO Content Brief', 'SEO and Website Content', 'Build a search-intent-aware brief from supplied keywords and facts.', 'seo', 'outline', { requiredPlan: 'pro', isNew: true }),
  seed('meta-title', 'Meta Title Generator', 'SEO and Website Content', 'Create concise, relevant page-title options.', 'seo', 'structured', { isNew: true }),
  seed('heading-outline', 'H1/H2 Outline', 'SEO and Website Content', 'Plan an accessible page heading hierarchy.', 'seo', 'outline', { isNew: true }),
  seed('faq-schema-content', 'FAQ Schema Content', 'SEO and Website Content', 'Draft factual FAQ content ready for technical schema implementation.', 'seo', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('local-seo-page', 'Local SEO Page Copy', 'SEO and Website Content', 'Draft a location page using verified business and service details.', 'seo', 'document', { requiredPlan: 'pro', isNew: true }),
  seed('meta-ads', 'Meta Ads Copy', 'Marketing and Advertising', 'Create platform-aware ad variants from verified offer details.', 'advertising', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('cta-generator', 'CTA Generator', 'Marketing and Advertising', 'Generate concise calls to action for a defined audience and goal.', 'marketing', 'structured', { isNew: true }),
  seed('email-campaign', 'Email Campaign', 'Marketing and Advertising', 'Plan a connected sequence of campaign emails.', 'marketing', 'outline', { requiredPlan: 'pro', isNew: true }),
  seed('campaign-brief', 'Campaign Brief', 'Marketing and Advertising', 'Turn objectives, audience, offer, and evidence into an actionable brief.', 'marketing', 'structured', { isNew: true }),
  seed('marketing-strategy-outline', 'Marketing Strategy Outline', 'Marketing and Advertising', 'Build a practical strategy outline without fake forecasts.', 'marketing', 'outline', { requiredPlan: 'pro', isNew: true }),
  seed('carousel-copy', 'Carousel Copy', 'Marketing and Advertising', 'Create slide-by-slide carousel copy with a clear narrative.', 'social', 'structured', { isNew: true }),
  seed('reel-hooks', 'Reel Hooks', 'Marketing and Advertising', 'Create short, responsible opening hooks for vertical video.', 'social', 'structured', { isNew: true }),
  seed('facebook-post', 'Facebook Post', 'Social Media', 'Draft a complete Facebook post for a real goal and audience.', 'social', 'social', { isNew: true }),
  seed('threads-post', 'Threads Post', 'Social Media', 'Create a concise conversational Threads post.', 'social', 'social', { isNew: true }),
  seed('youtube-title', 'YouTube Title', 'Social Media', 'Generate accurate, non-misleading title options.', 'social', 'structured', { isNew: true }),
  seed('youtube-description', 'YouTube Description', 'Social Media', 'Create a structured description from supplied video facts.', 'social', 'structured', { isNew: true }),
  seed('reel-caption', 'Reel Caption', 'Social Media', 'Write a concise caption aligned with the supplied reel.', 'social', 'social', { isNew: true }),
  seed('hashtag-generator', 'Hashtag Generator', 'Social Media', 'Suggest relevant hashtags without popularity claims.', 'social', 'structured', { isNew: true }),
  seed('google-business-post', 'Google Business Profile Post', 'Social Media', 'Draft a factual local business update or offer.', 'social', 'social', { isNew: true }),
  seed('amazon-listing', 'Amazon Product Listing', 'Product and E-commerce', 'Create grounded title, bullets, and description sections.', 'product', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('shopify-product-copy', 'Shopify Product Copy', 'Product and E-commerce', 'Draft storefront-ready copy from real product facts.', 'product', 'structured', { isNew: true }),
  seed('etsy-listing', 'Etsy Listing', 'Product and E-commerce', 'Create an accurate handmade or marketplace listing.', 'product', 'structured', { isNew: true }),
  seed('product-benefits', 'Product Benefits', 'Product and E-commerce', 'Translate verified features into customer-relevant benefits.', 'product', 'structured', { isNew: true }),
  seed('product-comparison', 'Product Comparison', 'Product and E-commerce', 'Compare only supplied product facts in a neutral structure.', 'product', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('review-response', 'Product Review Response', 'Product and E-commerce', 'Draft a helpful response to a real customer review.', 'product', 'email', { isNew: true }),
  seed('job-description', 'Job Description', 'Career and Professional', 'Create a clear role description without discriminatory criteria.', 'hr', 'structured', { isNew: true }),
  seed('interview-questions', 'Interview Questions', 'Career and Professional', 'Create role-relevant, evidence-oriented interview questions.', 'hr', 'structured', { isNew: true }),
  seed('offer-letter', 'Offer Letter Draft', 'Career and Professional', 'Prepare an informational offer-letter draft for qualified review.', 'hr', 'email', { requiredPlan: 'pro', isNew: true, legalReviewRequired: true }),
  seed('employee-announcement', 'Employee Announcement', 'Career and Professional', 'Draft a respectful internal people announcement.', 'hr', 'email', { isNew: true }),
  seed('performance-review', 'Performance Review Draft', 'Career and Professional', 'Organize supplied performance evidence into constructive feedback.', 'hr', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('investor-pitch', 'Investor Pitch', 'Business and Sales', 'Structure a pitch from verified company, market, and traction facts.', 'business', 'outline', { requiredPlan: 'pro', isNew: true }),
  seed('elevator-pitch', 'Elevator Pitch', 'Business and Sales', 'Create a concise company introduction for a specific audience.', 'business', 'structured', { isNew: true }),
  seed('executive-summary', 'Executive Summary', 'Business and Sales', 'Condense supplied business facts into a decision-ready summary.', 'business', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('swot-analysis', 'SWOT Analysis', 'Business and Sales', 'Organize user-supplied evidence into strengths, weaknesses, opportunities, and threats.', 'business', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('business-model-canvas', 'Business Model Canvas', 'Business and Sales', 'Draft the nine canvas sections from supplied business facts.', 'business', 'structured', { requiredPlan: 'pro', isNew: true }),
  seed('client-proposal', 'Client Proposal', 'Business and Sales', 'Create a scoped proposal without inventing price or commitments.', 'business', 'document', { isNew: true }),
  seed('follow-up-message', 'Follow-up Message', 'Business and Sales', 'Write a concise follow-up with context and a clear next step.', 'email', 'email', { isNew: true }),
  seed('lesson-plan', 'Lesson Plan', 'Education and Academic', 'Create objectives, activities, checks, and follow-up work.', 'education', 'structured', { isNew: true }),
  seed('quiz-generator', 'Quiz Generator', 'Education and Academic', 'Create a grounded quiz from supplied learning material.', 'education', 'structured', { isNew: true }),
  seed('mcq-generator', 'MCQ Generator', 'Education and Academic', 'Create multiple-choice questions and a separate answer key.', 'education', 'structured', { isNew: true }),
  seed('flashcards', 'Flashcards', 'Education and Academic', 'Turn supplied material into concise question-and-answer cards.', 'education', 'structured', { isNew: true }),
  seed('study-notes', 'Study Notes', 'Education and Academic', 'Organize supplied material into readable study notes.', 'education', 'document', { isNew: true }),
  seed('course-outline', 'Course Outline', 'Education and Academic', 'Build a sequenced course outline around stated objectives.', 'education', 'outline', { requiredPlan: 'pro', isNew: true }),
  seed('meeting-agenda', 'Meeting Agenda', 'Utility and Productivity', 'Create a timed agenda with outcomes and owners.', 'business', 'structured', { isNew: true }),
  seed('action-items', 'Action Items', 'Utility and Productivity', 'Extract owners, tasks, due dates, and dependencies from supplied notes.', 'business', 'structured', { isNew: true }),
  seed('daily-report', 'Daily Report', 'Utility and Productivity', 'Create a concise daily status report.', 'report', 'structured', { isNew: true }),
  seed('weekly-report', 'Weekly Report', 'Utility and Productivity', 'Create a decision-ready weekly status report.', 'report', 'structured', { isNew: true }),
  seed('monthly-report', 'Monthly Report', 'Utility and Productivity', 'Create a structured monthly performance report from supplied evidence.', 'report', 'document', { requiredPlan: 'pro', isNew: true }),
  seed('task-breakdown', 'Task Breakdown', 'Utility and Productivity', 'Turn a defined objective into sequenced, actionable tasks.', 'business', 'structured', { isNew: true }),
  seed('process-documentation', 'Process Documentation', 'Utility and Productivity', 'Document a repeatable process from supplied steps and controls.', 'business', 'document', { requiredPlan: 'pro', isNew: true }),
];

const iconForCategory = (category: string) => {
  if (category.includes('Academic')) return 'graduation';
  if (category.includes('Business') || category.includes('Career')) return 'briefcase';
  if (category.includes('Email') || category.includes('Marketing')) return 'mail';
  if (category.includes('Social') || category.includes('SEO')) return 'globe';
  if (category.includes('Creative') || category.includes('Personal')) return 'pen';
  if (category.includes('Video')) return 'video';
  return 'sparkles';
};

const defaultStructure: Record<WriterOutputType, string[]> = {
  document: ['Title', 'Opening', 'Structured body', 'Conclusion'],
  outline: ['Title', 'Ordered sections', 'Supporting points'],
  email: ['Subject', 'Greeting', 'Message', 'Call to action', 'Sign-off'],
  social: ['Opening hook', 'Main message', 'Call to action'],
  structured: ['Labeled sections', 'Actionable output'],
};

export const WRITER_TEMPLATES: WriterTemplateDefinition[] = seeds.map(item => ({
  id: item.id,
  name: item.name,
  route: `/ai-writer/template/${item.id}`,
  category: item.category,
  description: item.description,
  icon: iconForCategory(item.category),
  keywords: [...new Set(`${item.name} ${item.category} ${item.description}`.toLowerCase().split(/\W+/).filter(Boolean))],
  useCases: [item.description],
  inputFields: profiles[item.profile].map(field => ({ ...field })),
  outputType: item.outputType,
  defaultTone: item.category.includes('Creative') ? 'creative' : item.category.includes('Personal') ? 'friendly' : 'professional',
  supportedTones: item.category.includes('Business') || item.category.includes('Career') ? ['professional', 'formal', 'confident', 'persuasive', 'empathetic', 'direct'] : [...WRITER_TONES],
  supportedLanguages: [...WRITER_LANGUAGES],
  supportedLengths: [...WRITER_LENGTHS],
  guestAccess: (item.requiredPlan || 'free') === 'free',
  requiredPlan: item.requiredPlan || 'free',
  status: 'available',
  featured: Boolean(item.featured),
  popular: Boolean(item.popular),
  isNew: Boolean(item.isNew),
  systemInstructionKey: item.profile,
  outputSchema: item.outputType,
  previewStructure: item.structure || defaultStructure[item.outputType],
  setupComplexity: item.outputType === 'structured' ? 'Guided' : item.requiredPlan === 'pro' ? 'Advanced' : 'Guided',
  compatibleExports: item.outputType === 'structured' || item.outputType === 'outline' ? ['txt', 'md', 'html'] : ['txt', 'md', 'html'],
  legalReviewRequired: item.legalReviewRequired,
}));

export const WRITER_CATEGORIES = [...new Set(WRITER_TEMPLATES.map(template => template.category))];

export function findWriterTemplate(id: string) {
  return WRITER_TEMPLATES.find(template => template.id === id);
}
