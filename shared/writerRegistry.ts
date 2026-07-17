export type WriterPlan = 'free' | 'pro' | 'pro_plus';
export type WriterFieldType = 'text' | 'textarea' | 'select' | 'tags' | 'url';

export interface WriterFieldDefinition {
  id: string;
  label: string;
  type: WriterFieldType;
  placeholder: string;
  description?: string;
  required?: boolean;
  maxLength: number;
  options?: string[];
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
  outputType: 'document' | 'outline' | 'email' | 'social' | 'structured';
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
}

export const WRITER_LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Italian'] as const;
export const WRITER_LENGTHS = ['short', 'medium', 'long'] as const;
export const WRITER_TONES = ['neutral', 'professional', 'formal', 'friendly', 'casual', 'confident', 'persuasive', 'empathetic', 'informative', 'creative', 'enthusiastic', 'direct'] as const;

const topic: WriterFieldDefinition = { id: 'topic', label: 'Topic or request', type: 'textarea', placeholder: 'Describe the content you want to create…', required: true, maxLength: 5000 };
const audience: WriterFieldDefinition = { id: 'audienceDetails', label: 'Audience details', type: 'text', placeholder: 'Who should this content speak to?', maxLength: 300 };
const keyPoints: WriterFieldDefinition = { id: 'keyPoints', label: 'Key points', type: 'textarea', placeholder: 'Add facts, source notes, requirements, or points to include', maxLength: 4000 };
const keywords: WriterFieldDefinition = { id: 'keywords', label: 'Keywords', type: 'tags', placeholder: 'Comma-separated keywords', maxLength: 500 };
const cta: WriterFieldDefinition = { id: 'callToAction', label: 'Call to action', type: 'text', placeholder: 'What should the reader do next?', maxLength: 300 };
const sourceNotes: WriterFieldDefinition = { id: 'sourceNotes', label: 'Source notes', type: 'textarea', placeholder: 'Paste verified facts or references. The writer will not invent citations.', maxLength: 6000 };
const product: WriterFieldDefinition = { id: 'product', label: 'Product or service', type: 'textarea', placeholder: 'Describe the product, service, offer, and differentiators', required: true, maxLength: 3000 };
const recipient: WriterFieldDefinition = { id: 'recipient', label: 'Recipient', type: 'text', placeholder: 'Recipient role or relationship', maxLength: 300 };
const platform: WriterFieldDefinition = { id: 'platform', label: 'Platform or format', type: 'select', placeholder: '', maxLength: 100, options: ['LinkedIn', 'Instagram', 'Facebook', 'X', 'YouTube', 'Other'] };
const role: WriterFieldDefinition = { id: 'role', label: 'Role or opportunity', type: 'textarea', placeholder: 'Paste the role details or professional objective', required: true, maxLength: 4000 };

const profiles: Record<string, WriterFieldDefinition[]> = {
  general: [topic, audience, keyPoints],
  longform: [topic, audience, keywords, keyPoints, sourceNotes, cta],
  academic: [topic, keyPoints, sourceNotes],
  business: [topic, audience, keyPoints, cta],
  marketing: [product, audience, keywords, cta, keyPoints],
  social: [topic, platform, audience, cta],
  career: [role, keyPoints, audience],
  email: [topic, recipient, keyPoints, cta],
  product: [product, audience, keywords, cta],
  script: [topic, audience, keyPoints, cta],
};

type Seed = [string, string, string, string, keyof typeof profiles, WriterTemplateDefinition['outputType'], WriterPlan?, boolean?, boolean?];

const seeds: Seed[] = [
  ['ai-writer', 'AI Writer', 'General Writing', 'Create a structured draft from your own instruction.', 'general', 'document', 'free', true, true],
  ['blog-writer', 'Blog Writer', 'Blog and Article', 'Create an organized blog draft with useful headings.', 'longform', 'document', 'free', true, true],
  ['article-writer', 'Article Writer', 'Blog and Article', 'Develop a clear analytical article from supplied facts.', 'longform', 'document'],
  ['essay-writer', 'Essay Writer', 'Education and Academic', 'Build a reasoned essay without invented citations.', 'academic', 'document'],
  ['story-writer', 'Story Writer', 'Creative Writing', 'Write an original story from your premise and constraints.', 'general', 'document'],
  ['book-writer', 'Book Writer', 'Creative Writing', 'Plan chapters, scenes, or a long-form narrative.', 'longform', 'outline', 'pro'],
  ['newsletter', 'Newsletter Draft', 'Email and Communication', 'Create a readable newsletter with sections and a CTA.', 'email', 'email'],
  ['speech', 'Speech Writer', 'Video and Audio Scripts', 'Draft a paced speech for a defined audience.', 'script', 'document'],
  ['script', 'Script Writer', 'Video and Audio Scripts', 'Create an audiovisual script with clear beats.', 'script', 'document'],
  ['research-paper', 'Research Paper', 'Education and Academic', 'Structure research writing around user-provided evidence.', 'academic', 'document', 'pro'],
  ['academic-abstract', 'Abstract Builder', 'Education and Academic', 'Condense supplied research into an abstract.', 'academic', 'structured'],
  ['literature-review', 'Literature Review', 'Education and Academic', 'Organize supplied studies without fabricating references.', 'academic', 'document', 'pro'],
  ['assignment', 'Academic Assignment', 'Education and Academic', 'Create a supported assignment draft or outline.', 'academic', 'document'],
  ['case-study', 'Case Study Draft', 'Business and Sales', 'Turn verified scenario details into a case study.', 'business', 'document'],
  ['thesis-gen', 'Thesis Statement', 'Education and Academic', 'Generate focused, arguable thesis options.', 'academic', 'structured'],
  ['dissertation', 'Dissertation Outline', 'Education and Academic', 'Build a detailed dissertation structure.', 'academic', 'outline', 'pro'],
  ['citation-builder', 'Citation Builder', 'Education and Academic', 'Format complete reference details supplied by the user.', 'academic', 'structured'],
  ['biz-proposal', 'Business Proposal', 'Business and Sales', 'Create a persuasive, structured client proposal.', 'business', 'document', 'free', true, true],
  ['biz-plan', 'Business Plan', 'Business and Sales', 'Develop a practical business-plan outline.', 'business', 'outline', 'pro'],
  ['invoice-notes', 'Invoice Builder', 'Business and Sales', 'Write clear invoice line descriptions and notes.', 'business', 'structured'],
  ['meeting-notes', 'Meeting Notes', 'Utility and Productivity', 'Transform supplied notes into decisions and actions.', 'business', 'structured'],
  ['minutes', 'Minutes of Meeting', 'Utility and Productivity', 'Create formal minutes from supplied meeting facts.', 'business', 'structured'],
  ['company-profile', 'Company Profile', 'Business and Sales', 'Draft a company profile using verified company details.', 'business', 'document'],
  ['resume-builder', 'Resume Builder', 'Career and Professional', 'Create truthful, impact-focused resume content.', 'career', 'structured', 'free', true, true],
  ['resume-optimizer', 'Resume Optimizer', 'Career and Professional', 'Align supplied resume content to a role without inventing experience.', 'career', 'document', 'pro'],
  ['cover-letter', 'Cover Letter', 'Career and Professional', 'Write a tailored cover letter from real experience.', 'career', 'email'],
  ['sop-builder', 'SOP Builder (SOP)', 'Career and Professional', 'Structure a statement of purpose from real achievements.', 'career', 'document'],
  ['lor-builder', 'Letter of Recommendation', 'Career and Professional', 'Draft a recommendation from supplied evidence.', 'career', 'email', 'pro'],
  ['landing-page', 'Landing Page Copy', 'SEO and Website Content', 'Create focused landing-page sections and calls to action.', 'marketing', 'structured', 'free', true, true],
  ['sales-copy', 'Sales Copy', 'Marketing and Advertising', 'Create benefit-led sales copy from supplied claims.', 'marketing', 'document'],
  ['google-ads', 'Google Ads', 'Marketing and Advertising', 'Generate character-aware ad headlines and descriptions.', 'marketing', 'structured', 'pro'],
  ['seo-article', 'SEO Article', 'SEO and Website Content', 'Create useful keyword-aware content without ranking claims.', 'longform', 'document', 'pro'],
  ['linkedin-post', 'LinkedIn Post', 'Social Media', 'Write a professional post with an authentic point of view.', 'social', 'social', 'free', true, true],
  ['twitter-x', 'Twitter/X Thread', 'Social Media', 'Create a concise short-post thread.', 'social', 'social'],
  ['instagram-caption', 'Instagram Caption', 'Social Media', 'Write a platform-aware caption and relevant hashtags.', 'social', 'social'],
  ['poem', 'Poem Generator', 'Creative Writing', 'Create an original poem from a theme and form.', 'general', 'document'],
  ['lyrics', 'Lyrics Generator', 'Creative Writing', 'Create original song lyrics without imitating living artists.', 'general', 'document', 'pro'],
  ['api-doc', 'API Documentation', 'Utility and Productivity', 'Turn supplied endpoint details into Markdown documentation.', 'general', 'document'],
  ['readme-gen', 'README Builder', 'Utility and Productivity', 'Create a useful README from supplied project facts.', 'general', 'document'],
  ['prompt-writing', 'Prompt Optimizer', 'Utility and Productivity', 'Improve a prompt while keeping user data separate.', 'general', 'structured'],
  ['blog-outline', 'Blog Outline', 'Blog and Article', 'Plan a useful article before drafting.', 'longform', 'outline'],
  ['professional-email', 'Professional Email', 'Email and Communication', 'Write a concise professional email.', 'email', 'email'],
  ['cold-email', 'Cold Email', 'Email and Communication', 'Create responsible outreach from a real offer.', 'email', 'email', 'pro'],
  ['customer-support-reply', 'Customer Support Reply', 'Email and Communication', 'Draft an empathetic response from supplied case details.', 'email', 'email'],
  ['meta-description', 'Meta Description Generator', 'SEO and Website Content', 'Create concise page descriptions from supplied content.', 'marketing', 'structured'],
  ['product-description', 'Product Description', 'Product and E-commerce', 'Turn verified product details into useful product copy.', 'product', 'structured'],
  ['product-faq', 'Product FAQ', 'Product and E-commerce', 'Create FAQs grounded in supplied product information.', 'product', 'structured'],
  ['youtube-script', 'YouTube Script', 'Video and Audio Scripts', 'Create an organized video script with hook and CTA.', 'script', 'document'],
  ['podcast-outline', 'Podcast Outline', 'Video and Audio Scripts', 'Plan a podcast episode with segments and prompts.', 'script', 'outline'],
  ['story-outline', 'Story Outline', 'Creative Writing', 'Plan plot, characters, scenes, and resolution.', 'general', 'outline'],
  ['formal-application', 'Formal Application', 'Personal Writing', 'Draft a respectful formal application.', 'email', 'email'],
  ['announcement', 'Announcement', 'Personal Writing', 'Create a clear announcement from supplied details.', 'general', 'document'],
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

export const WRITER_TEMPLATES: WriterTemplateDefinition[] = seeds.map(([id, name, category, description, profile, outputType, requiredPlan = 'free', featured = false, popular = false]) => ({
  id,
  name,
  route: `/ai-writer/template/${id}`,
  category,
  description,
  icon: iconForCategory(category),
  keywords: [...new Set(`${name} ${category} ${description}`.toLowerCase().split(/\W+/).filter(Boolean))],
  useCases: [description],
  inputFields: profiles[profile],
  outputType,
  defaultTone: category.includes('Creative') ? 'creative' : category.includes('Personal') ? 'friendly' : 'professional',
  supportedTones: category.includes('Business') || category.includes('Career') ? ['professional', 'formal', 'confident', 'persuasive'] : [...WRITER_TONES],
  supportedLanguages: [...WRITER_LANGUAGES],
  supportedLengths: [...WRITER_LENGTHS],
  guestAccess: requiredPlan === 'free',
  requiredPlan,
  status: 'available',
  featured,
  popular,
  isNew: !['ai-writer', 'blog-writer', 'article-writer', 'essay-writer', 'story-writer', 'book-writer', 'newsletter', 'speech', 'script', 'research-paper', 'academic-abstract', 'literature-review', 'assignment', 'case-study', 'thesis-gen', 'dissertation', 'citation-builder', 'biz-proposal', 'biz-plan', 'invoice-notes', 'meeting-notes', 'minutes', 'company-profile', 'resume-builder', 'resume-optimizer', 'cover-letter', 'sop-builder', 'lor-builder', 'landing-page', 'sales-copy', 'google-ads', 'seo-article', 'linkedin-post', 'twitter-x', 'instagram-caption', 'poem', 'lyrics', 'api-doc', 'readme-gen', 'prompt-writing'].includes(id),
  systemInstructionKey: profile,
  outputSchema: outputType,
}));

export const WRITER_CATEGORIES = [...new Set(WRITER_TEMPLATES.map(template => template.category))];

export function findWriterTemplate(id: string) {
  return WRITER_TEMPLATES.find(template => template.id === id);
}
