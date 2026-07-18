export type BusinessCategory =
  | 'Email'
  | 'Marketing'
  | 'Social'
  | 'Commerce'
  | 'Proposals'
  | 'Reports'
  | 'Operations'
  | 'Planning';

export type BusinessOutputType = 'email' | 'document' | 'social' | 'campaign' | 'calendar';
export type BusinessPlan = 'free' | 'pro';

export interface BusinessToolDefinition {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  outputType: BusinessOutputType;
  guestAccess: boolean;
  requiredPlan: BusinessPlan;
  informationalOnly?: boolean;
  platform?: string;
  platformLimit?: number;
}

const tool = (
  id: string,
  name: string,
  category: BusinessCategory,
  description: string,
  outputType: BusinessOutputType = 'document',
  requiredPlan: BusinessPlan = 'free',
  options: Pick<BusinessToolDefinition, 'informationalOnly' | 'platform' | 'platformLimit'> = {},
): BusinessToolDefinition => ({
  id,
  name,
  category,
  description,
  outputType,
  requiredPlan,
  guestAccess: requiredPlan === 'free',
  ...options,
});

export const BUSINESS_TOOLS: BusinessToolDefinition[] = [
  tool('professional-email', 'Professional Email', 'Email', 'Clear professional communication.', 'email'),
  tool('cold-email', 'Cold Outreach Email', 'Email', 'Responsible outreach grounded in a real offer.', 'email', 'pro'),
  tool('sales-email', 'Sales Email', 'Email', 'Benefit-led sales communication from verified claims.', 'email'),
  tool('follow-up-email', 'Follow-up Email', 'Email', 'Respectful follow-up with a clear next step.', 'email'),
  tool('hr-email', 'HR Email', 'Email', 'Workplace communication using supplied policy facts.', 'email'),
  tool('support-email', 'Customer Support Email', 'Email', 'Empathetic case-specific responses.', 'email'),
  tool('business-letter', 'Business Letter', 'Email', 'Formal business correspondence.'),
  tool('legal-letter', 'Legal Letter Assistant', 'Email', 'Informational drafting for qualified review.', 'document', 'pro', { informationalOnly: true }),

  tool('marketing-campaign', 'Marketing Campaign', 'Marketing', 'Channel-aware campaign messaging and deliverables.', 'campaign', 'pro'),
  tool('google-search-ads', 'Google Search Ads', 'Marketing', 'Search headlines and descriptions from verified claims.', 'social', 'pro', { platform: 'Google Search', platformLimit: 90 }),
  tool('performance-max', 'Performance Max Copy', 'Marketing', 'Performance Max headline and description variants.', 'social', 'pro', { platform: 'Google Performance Max', platformLimit: 90 }),
  tool('meta-ads', 'Meta Ads', 'Marketing', 'Facebook and Instagram ad-copy variants.', 'social', 'pro', { platform: 'Meta Ads', platformLimit: 125 }),
  tool('carousel-copy', 'Carousel Copy', 'Marketing', 'Slide-by-slide carousel messaging.', 'social', 'pro', { platform: 'Carousel', platformLimit: 2200 }),
  tool('reel-hooks', 'Reel Hooks', 'Marketing', 'Short-form video hooks without invented outcomes.', 'social', 'pro', { platform: 'Reels', platformLimit: 150 }),
  tool('youtube-descriptions', 'YouTube Descriptions', 'Marketing', 'Search-aware descriptions from supplied facts.', 'social', 'pro', { platform: 'YouTube', platformLimit: 5000 }),
  tool('youtube-titles', 'YouTube Titles', 'Marketing', 'Concise video-title variants.', 'social', 'pro', { platform: 'YouTube', platformLimit: 100 }),
  tool('seo-titles', 'SEO Titles', 'Marketing', 'Search-title variants from supplied keywords.', 'social', 'pro', { platform: 'Search', platformLimit: 60 }),
  tool('meta-descriptions', 'Meta Descriptions', 'Marketing', 'Accurate search descriptions.', 'social', 'pro', { platform: 'Search', platformLimit: 160 }),
  tool('product-ads', 'Product Ads', 'Marketing', 'Product advertising copy using verified features.', 'social', 'pro'),
  tool('display-ads', 'Display Ads', 'Marketing', 'Compact display-ad variants.', 'social', 'pro', { platform: 'Display', platformLimit: 90 }),
  tool('blog-marketing', 'Blog Marketing Copy', 'Marketing', 'Promotion copy for a real article.'),
  tool('landing-page', 'Landing Page Copy', 'Marketing', 'Structured page copy from verified benefits.', 'document', 'pro'),
  tool('press-release', 'Press Release', 'Marketing', 'Factual announcement copy.', 'document', 'pro'),
  tool('sales-funnel', 'Sales Funnel Copy', 'Marketing', 'Stage-aware funnel messaging.', 'campaign', 'pro'),
  tool('webinar', 'Webinar Copy', 'Marketing', 'Registration, reminder and follow-up copy.', 'campaign', 'pro'),

  tool('linkedin', 'LinkedIn Post', 'Social', 'Professional platform-aware post.', 'social', 'free', { platform: 'LinkedIn', platformLimit: 3000 }),
  tool('instagram', 'Instagram Caption', 'Social', 'Caption with optional hashtags and emoji.', 'social', 'free', { platform: 'Instagram', platformLimit: 2200 }),
  tool('facebook', 'Facebook Post', 'Social', 'Audience-aware Facebook copy.', 'social', 'free', { platform: 'Facebook', platformLimit: 63206 }),
  tool('x-post', 'X Post', 'Social', 'Concise post within the configured platform limit.', 'social', 'free', { platform: 'X', platformLimit: 280 }),
  tool('threads', 'Threads Post', 'Social', 'Conversational Threads copy.', 'social', 'free', { platform: 'Threads', platformLimit: 500 }),
  tool('pinterest', 'Pinterest Copy', 'Social', 'Pin title and description grounded in supplied details.', 'social', 'pro', { platform: 'Pinterest', platformLimit: 500 }),
  tool('youtube-community', 'YouTube Community Post', 'Social', 'Community post for a real channel update.', 'social', 'pro', { platform: 'YouTube Community', platformLimit: 1500 }),
  tool('google-business-profile', 'Google Business Profile Post', 'Social', 'Accurate local-business update.', 'social', 'pro', { platform: 'Google Business Profile', platformLimit: 1500 }),
  tool('whatsapp', 'WhatsApp Campaign', 'Social', 'Consent-aware message copy.', 'social', 'pro', { platform: 'WhatsApp', platformLimit: 1000 }),
  tool('sms', 'SMS Campaign', 'Social', 'Compact opt-out-aware campaign text.', 'social', 'pro', { platform: 'SMS', platformLimit: 160 }),
  tool('push-notification', 'Push Notification', 'Social', 'Compact title and message.', 'social', 'pro', { platform: 'Push notification', platformLimit: 178 }),

  tool('product-description', 'Product Description', 'Commerce', 'Product copy from verified specifications.'),
  tool('amazon-listing', 'Amazon Listing', 'Commerce', 'Listing title, bullets and description from facts.', 'document', 'pro'),
  tool('flipkart-listing', 'Flipkart Listing', 'Commerce', 'Marketplace listing from real product details.', 'document', 'pro'),
  tool('shopify-product', 'Shopify Product Copy', 'Commerce', 'Store-ready product copy from verified details.', 'document', 'pro'),
  tool('faq', 'FAQ Generator', 'Commerce', 'Questions and answers supported by the supplied brief.'),
  tool('testimonial-request', 'Testimonial Request', 'Commerce', 'Request a genuine customer testimonial without fabricating one.', 'email', 'pro'),

  tool('proposal', 'Client Proposal', 'Proposals', 'Service proposal with supplied scope and pricing.', 'document', 'pro'),
  tool('software-proposal', 'Software Proposal', 'Proposals', 'Software scope, implementation and assumptions.', 'document', 'pro'),
  tool('agency-proposal', 'Agency Proposal', 'Proposals', 'Agency deliverables, timeline and exclusions.', 'document', 'pro'),
  tool('quotation', 'Quotation Text', 'Proposals', 'Quotation language using only supplied pricing.', 'document', 'pro'),
  tool('implementation-plan', 'Implementation Plan', 'Proposals', 'Phased plan grounded in supplied scope.', 'document', 'pro'),
  tool('invoice-text', 'Invoice Text', 'Proposals', 'Invoice notes and payment wording from supplied terms.'),

  tool('executive-summary', 'Executive Summary', 'Reports', 'Decision-ready summary from source facts.'),
  tool('weekly-report', 'Weekly Report', 'Reports', 'Weekly progress report without invented metrics.'),
  tool('monthly-report', 'Monthly Report', 'Reports', 'Monthly progress report without invented metrics.', 'document', 'pro'),
  tool('quarterly-report', 'Quarterly Report', 'Reports', 'Quarterly report using supplied evidence.', 'document', 'pro'),
  tool('annual-report', 'Annual Report', 'Reports', 'Annual narrative using supplied evidence.', 'document', 'pro'),
  tool('case-study', 'Case Study', 'Reports', 'Evidence-based case study with no invented results.', 'document', 'pro'),

  tool('business-profile', 'Business Profile', 'Operations', 'Reusable company profile from verified details.'),
  tool('company-introduction', 'Company Introduction', 'Operations', 'Concise company introduction from verified facts.'),
  tool('meeting-agenda', 'Meeting Agenda', 'Operations', 'Structured agenda with purpose and owners.'),
  tool('meeting-minutes', 'Meeting Minutes', 'Operations', 'Minutes from supplied notes only.'),
  tool('sop', 'SOP Generator', 'Operations', 'Workflow, responsibilities, approvals and review schedule.', 'document', 'pro'),
  tool('policy', 'Policy Generator', 'Operations', 'Informational internal-policy draft for review.', 'document', 'pro'),
  tool('internal-memo', 'Internal Memo', 'Operations', 'Concise internal communication.'),
  tool('presentation-outline', 'Presentation Outline', 'Operations', 'Slide-by-slide outline from supplied facts.'),

  tool('campaign-planner', 'Campaign Planner', 'Planning', 'Goal, audience, budget, channels, timeline and KPIs.', 'campaign', 'pro'),
  tool('content-calendar', 'Content Calendar', 'Planning', 'Daily, weekly or monthly content schedule.', 'calendar', 'pro'),
];

export const EMAIL_MODES = [
  'Professional', 'Cold Outreach', 'Sales', 'Follow-up', 'HR', 'Internal',
  'Customer Support', 'Complaint', 'Apology', 'Thank You', 'Meeting Request',
  'Interview', 'Partnership', 'Investor', 'Vendor', 'Recruitment',
] as const;

export const BUSINESS_LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Portuguese'] as const;
export const BUSINESS_TONES = ['Professional', 'Confident', 'Friendly', 'Empathetic', 'Persuasive', 'Concise', 'Formal', 'Conversational'] as const;
export const CALENDAR_CADENCES = ['Daily', 'Weekly', 'Monthly'] as const;
export const BUSINESS_EXPORT_FORMATS = ['docx', 'pdf', 'md', 'html', 'txt'] as const;
