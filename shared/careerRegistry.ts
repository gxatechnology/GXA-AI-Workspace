export type CareerToolCategory = 'Build' | 'Optimize' | 'Applications' | 'Profile' | 'Prepare';
export interface CareerToolDefinition { id: string; name: string; view: string; category: CareerToolCategory; description: string; guestAccess: boolean; requiredPlan: 'free' | 'pro'; supportsImport?: boolean; supportsExport?: boolean; status: 'available' | 'unavailable'; }
export const CAREER_TOOLS: CareerToolDefinition[] = [
  { id: 'resume', name: 'Resume Builder', view: 'resume', category: 'Build', description: 'Create a structured resume from verified information.', guestAccess: true, requiredPlan: 'free', supportsImport: true, supportsExport: true, status: 'available' },
  { id: 'import', name: 'Resume Import', view: 'import', category: 'Build', description: 'Extract and review real PDF or text resume content.', guestAccess: true, requiredPlan: 'free', supportsImport: true, status: 'available' },
  { id: 'ats', name: 'ATS Guidance', view: 'ats', category: 'Optimize', description: 'Review documented formatting, completeness and job-alignment factors.', guestAccess: true, requiredPlan: 'free', status: 'available' },
  { id: 'cover-letter', name: 'Cover Letter', view: 'cover', category: 'Applications', description: 'Draft a grounded cover letter from supplied facts.', guestAccess: true, requiredPlan: 'free', supportsExport: true, status: 'available' },
  { id: 'profile', name: 'Career Profile', view: 'profile', category: 'Profile', description: 'Maintain reusable verified career facts.', guestAccess: false, requiredPlan: 'free', status: 'available' },
  { id: 'linkedin', name: 'LinkedIn & Bio', view: 'linkedin', category: 'Profile', description: 'Create profile content without direct publishing.', guestAccess: true, requiredPlan: 'free', status: 'available' },
  { id: 'interview', name: 'Interview Preparation', view: 'interview', category: 'Prepare', description: 'Build questions, STAR answers and elevator pitches.', guestAccess: true, requiredPlan: 'free', status: 'available' },
  { id: 'library', name: 'Career Library', view: 'library', category: 'Build', description: 'Open saved resumes and versions.', guestAccess: false, requiredPlan: 'free', status: 'available' },
  { id: 'applications', name: 'Application Tracker', view: 'applications', category: 'Applications', description: 'Not available until secure persistence is configured.', guestAccess: false, requiredPlan: 'pro', status: 'unavailable' }
];
export interface ResumeTemplateDefinition { id: string; name: string; category: string; atsFriendly: boolean; requiredPlan: 'free' | 'pro'; description: string; }
export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  { id: 'gxa-ats', name: 'GXA ATS', category: 'ATS Friendly', atsFriendly: true, requiredPlan: 'free', description: 'Single-column layout with conventional headings.' },
  { id: 'gxa-modern', name: 'GXA Modern', category: 'Professional', atsFriendly: true, requiredPlan: 'free', description: 'Clean typography with a restrained accent.' },
  { id: 'gxa-academic', name: 'GXA Academic', category: 'Academic', atsFriendly: false, requiredPlan: 'free', description: 'Detailed sections for research and publications.' }
] as const;
export const RESUME_SECTIONS = ['header', 'summary', 'objective', 'experience', 'education', 'skills', 'projects', 'certifications', 'courses', 'languages', 'achievements', 'awards', 'internships', 'volunteer', 'publications', 'references', 'custom'] as const;
