export type MediaSection =
  | 'Create'
  | 'Edit'
  | 'OCR'
  | 'Document Vision'
  | 'Marketing'
  | 'Brand';

export type MediaOperation = 'generate' | 'edit' | 'vision' | 'local' | 'barcode' | 'vector';
export type MediaPlan = 'free' | 'pro' | 'pro_plus';

export interface MediaToolDefinition {
  id: string;
  name: string;
  section: MediaSection;
  description: string;
  operation: MediaOperation;
  requiredPlan: MediaPlan;
  requiresImage: boolean;
  supportsBatch?: boolean;
  sensitive?: boolean;
}

const mediaTool = (
  id: string,
  name: string,
  section: MediaSection,
  description: string,
  operation: MediaOperation,
  requiredPlan: MediaPlan = 'free',
  options: Partial<Pick<MediaToolDefinition, 'requiresImage' | 'supportsBatch' | 'sensitive'>> = {},
): MediaToolDefinition => ({
  id,
  name,
  section,
  description,
  operation,
  requiredPlan,
  requiresImage: operation === 'edit' || operation === 'vision' || operation === 'local' || operation === 'barcode',
  ...options,
});

export const MEDIA_TOOLS: MediaToolDefinition[] = [
  mediaTool('image-generator', 'AI Image Generator', 'Create', 'Create an original visual from a written brief.', 'generate', 'free', { supportsBatch: true }),
  mediaTool('image-variations', 'Image Variations', 'Create', 'Create original alternatives from an uploaded image.', 'edit', 'pro', { supportsBatch: true }),
  mediaTool('illustration', 'Illustration Creator', 'Create', 'Create editorial or explanatory illustrations.', 'generate', 'pro'),
  mediaTool('icon-set', 'Icon Set Creator', 'Create', 'Create a consistent original icon family.', 'generate', 'pro'),
  mediaTool('product-visual', 'Product Visual', 'Create', 'Create a product visual from supplied product facts.', 'generate', 'pro'),

  mediaTool('background-remove', 'Background Removal', 'Edit', 'Remove the background where the provider can preserve transparency.', 'edit', 'pro'),
  mediaTool('background-replace', 'Background Replacement', 'Edit', 'Replace a background using a written scene description.', 'edit', 'pro'),
  mediaTool('upscale', 'Upscale and Enhance', 'Edit', 'Improve perceived detail while preserving the supplied subject.', 'edit', 'pro'),
  mediaTool('restore', 'Photo Restoration', 'Edit', 'Repair age-related damage without changing known identity or facts.', 'edit', 'pro_plus'),
  mediaTool('object-remove', 'Object Removal', 'Edit', 'Remove a described object and reconstruct the surrounding area.', 'edit', 'pro_plus'),
  mediaTool('lighting', 'Lighting and Color', 'Edit', 'Adjust lighting, contrast and color balance.', 'edit', 'pro'),
  mediaTool('crop-resize', 'Crop and Resize', 'Edit', 'Crop, rotate and resize locally in your browser.', 'local'),
  mediaTool('watermark-add', 'Add Watermark', 'Edit', 'Add your own text watermark locally.', 'local'),
  mediaTool('watermark-owned-remove', 'Remove Your Watermark', 'Edit', 'Remove only a watermark you own or are authorized to edit.', 'edit', 'pro_plus', { sensitive: true }),

  mediaTool('ocr-printed', 'Printed Text OCR', 'OCR', 'Extract printed text from a real image.', 'vision'),
  mediaTool('ocr-handwriting', 'Handwriting OCR', 'OCR', 'Extract handwriting with uncertainty clearly identified.', 'vision', 'pro'),
  mediaTool('ocr-table', 'Table OCR', 'OCR', 'Extract visible tables into structured Markdown.', 'vision', 'pro'),
  mediaTool('ocr-receipt', 'Receipt Reader', 'OCR', 'Extract visible receipt fields without inventing values.', 'vision', 'pro'),
  mediaTool('ocr-invoice', 'Invoice Reader', 'OCR', 'Extract visible invoice fields without inventing values.', 'vision', 'pro'),
  mediaTool('ocr-business-card', 'Business Card Reader', 'OCR', 'Extract visible contact fields.', 'vision', 'pro'),
  mediaTool('ocr-id', 'ID Document Reader', 'OCR', 'Extract visible fields; this does not verify identity or authenticity.', 'vision', 'pro_plus', { sensitive: true }),
  mediaTool('ocr-whiteboard', 'Whiteboard Reader', 'OCR', 'Extract visible notes and spatial groups.', 'vision', 'pro'),
  mediaTool('ocr-math', 'Math and Formula OCR', 'OCR', 'Transcribe visible equations and flag ambiguous symbols.', 'vision', 'pro_plus'),
  mediaTool('image-translate', 'Image Translation', 'OCR', 'Extract visible text and translate it into the selected language.', 'vision', 'pro'),

  mediaTool('caption', 'Image Caption', 'Document Vision', 'Produce a concise factual caption.', 'vision'),
  mediaTool('description', 'Detailed Description', 'Document Vision', 'Describe visible content and uncertainty.', 'vision'),
  mediaTool('visual-question', 'Ask About an Image', 'Document Vision', 'Answer a question using visible evidence only.', 'vision'),
  mediaTool('chart-analysis', 'Chart Analysis', 'Document Vision', 'Explain visible labels, trends and limitations without inventing data.', 'vision', 'pro'),
  mediaTool('diagram-analysis', 'Diagram Analysis', 'Document Vision', 'Explain visible nodes, connections and labels.', 'vision', 'pro'),
  mediaTool('screenshot-analysis', 'Screenshot Analysis', 'Document Vision', 'Review a real product or application screenshot.', 'vision', 'pro'),
  mediaTool('website-analysis', 'Website Screenshot Review', 'Document Vision', 'Review the uploaded website screenshot for usability and content.', 'vision', 'pro'),
  mediaTool('accessibility', 'Accessibility Description', 'Document Vision', 'Create useful alt text and flag visually evident concerns.', 'vision'),
  mediaTool('barcode', 'Barcode and QR Reader', 'Document Vision', 'Read supported codes locally when the browser provides BarcodeDetector.', 'barcode'),

  mediaTool('instagram-creative', 'Instagram Creative', 'Marketing', 'Create an original Instagram-ready visual.', 'generate', 'pro'),
  mediaTool('facebook-creative', 'Facebook Creative', 'Marketing', 'Create an original Facebook-ready visual.', 'generate', 'pro'),
  mediaTool('linkedin-creative', 'LinkedIn Creative', 'Marketing', 'Create an original professional social visual.', 'generate', 'pro'),
  mediaTool('display-ad', 'Google Display Ad', 'Marketing', 'Create an original display-ad concept from verified claims.', 'generate', 'pro_plus'),
  mediaTool('youtube-thumbnail', 'YouTube Thumbnail', 'Marketing', 'Create an original thumbnail without misleading claims.', 'generate', 'pro'),
  mediaTool('blog-image', 'Blog Feature Image', 'Marketing', 'Create a feature image from an article brief.', 'generate', 'pro'),
  mediaTool('hero-banner', 'Website Hero Banner', 'Marketing', 'Create an original website hero visual.', 'generate', 'pro'),
  mediaTool('poster', 'Poster Creator', 'Marketing', 'Create an original poster from supplied event or offer details.', 'generate', 'pro'),
  mediaTool('flyer', 'Flyer Creator', 'Marketing', 'Create an original flyer from supplied details.', 'generate', 'pro'),
  mediaTool('business-card', 'Business Card Concept', 'Marketing', 'Create a business-card visual from supplied contact details.', 'generate', 'pro'),
  mediaTool('certificate', 'Certificate Concept', 'Marketing', 'Create a certificate layout without inventing recipient data.', 'generate', 'pro'),
  mediaTool('brochure', 'Brochure Cover', 'Marketing', 'Create an original brochure-cover concept.', 'generate', 'pro_plus'),
  mediaTool('rollup-banner', 'Roll-up Banner', 'Marketing', 'Create an original exhibition banner concept.', 'generate', 'pro_plus'),
  mediaTool('infographic', 'Infographic', 'Marketing', 'Visualize only facts and figures supplied in the brief.', 'generate', 'pro_plus'),

  mediaTool('logo-concept', 'Logo Concept', 'Brand', 'Create an original logo concept without imitating another brand.', 'generate', 'pro'),
  mediaTool('vector-mark', 'Vector Brand Mark', 'Brand', 'Build a simple editable SVG mark from your name and initials.', 'vector', 'pro', { requiresImage: false }),
  mediaTool('favicon', 'Favicon', 'Brand', 'Create a compact original favicon concept.', 'generate', 'pro'),
  mediaTool('brand-variants', 'Brand Variants', 'Brand', 'Create monochrome, light and dark variants from an owned asset.', 'edit', 'pro_plus'),
];

export const MEDIA_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9'] as const;
export const MEDIA_QUALITIES = ['1K', '2K', '4K'] as const;
export const MEDIA_STYLES = ['Natural', 'Editorial', 'Illustration', 'Minimal', '3D', 'Cinematic', 'Product', 'Flat graphic'] as const;
export const MEDIA_EXPORT_FORMATS = ['png', 'jpg', 'webp', 'svg', 'pdf'] as const;

export const MEDIA_SECTIONS = ['Create', 'Edit', 'OCR', 'Document Vision', 'Marketing', 'Brand'] as const;

export const getMediaTool = (id: string) => MEDIA_TOOLS.find((tool) => tool.id === id);
