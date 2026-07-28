import { BUSINESS_LANGUAGES, BUSINESS_TOOLS } from '../../shared/businessRegistry.js';
import { RESUME_TEMPLATES } from '../../shared/careerRegistry.js';
import { MEDIA_TOOLS } from '../../shared/mediaRegistry.js';
import { applyPlatformMigration } from '../platform.js';
import { DIRECT_GEMINI_MEDIA_MODELS } from '../ai/registry.js';
import { TRANSLATION_LANGUAGES, TRANSLATION_MODES } from '../translation.js';

export function defaultApplicationConfig() {
  return {
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    chat_message_character_limit: 20000,
    chat_attachment_limit: 3,
    chat_attachment_size_mb: 10,
    chat_history_enabled: true,
    chat_models: [{ id: 'default', name: 'GXA AI', multimodal: true, plan: 'free' }],
    pdf_uploads_limit: 3,
    ocr_pages_limit: 2,
    document_upload_size_mb: 10,
    document_page_limit: 100,
    document_file_count_limit: 5,
    document_supported_types: ['application/pdf', 'text/plain', 'text/markdown'],
    grammar_corrections_limit: 5,
    originality_daily_limit: 5,
    originality_character_limit: 30000,
    translation_daily_limit: 10,
    translation_character_limit: 20000,
    translation_languages: TRANSLATION_LANGUAGES,
    translation_modes: TRANSLATION_MODES,
    career_daily_ai_limit: 5,
    career_resume_limit: 3,
    career_import_size_mb: 10,
    career_templates: RESUME_TEMPLATES,
    business_daily_generation_limit: 10,
    business_pro_daily_generation_limit: 100,
    business_character_limit: 20000,
    business_tools: BUSINESS_TOOLS,
    business_languages: BUSINESS_LANGUAGES,
    media_free_generation_limit: 3,
    media_pro_generation_limit: 25,
    media_pro_plus_generation_limit: 100,
    media_free_vision_limit: 5,
    media_pro_vision_limit: 50,
    media_pro_plus_vision_limit: 200,
    media_character_limit: 4000,
    media_upload_size_mb: 10,
    media_batch_limit: 4,
    media_asset_limit: 100,
    media_image_model: DIRECT_GEMINI_MEDIA_MODELS.image,
    media_vision_model: DIRECT_GEMINI_MEDIA_MODELS.vision,
    media_tools: MEDIA_TOOLS,
    ai_tool_model_overrides: {},
    writer_generations_limit: 5,
    writer_input_word_limit: 1500,
    writer_output_word_limit: 1200,
    feature_locks: { academic: true, creative: true, professional: true, custom: true },
    coupons: [],
    trial_days: 0,
  };
}

export function emptyApplicationDatabase() {
  return {
    users: {}, projects: {}, documents: {}, chats: {}, analyses: {}, translations: {},
    glossaries: {}, translationMemory: {}, translationJobs: {}, careerProfiles: {},
    resumes: {}, careerDocuments: {}, brandKits: {}, businessAssets: {}, mediaAssets: {},
    aiProviderRequests: [], config: defaultApplicationConfig(), usage: {},
  };
}

export function normalizeApplicationDatabase(input: unknown) {
  const source: Record<string, any> = input && typeof input === 'object' && !Array.isArray(input) ? structuredClone(input as Record<string, any>) : emptyApplicationDatabase();
  const defaults = defaultApplicationConfig();
  source.config = {
    ...defaults,
    ...(source.config && typeof source.config === 'object' ? source.config : {}),
    feature_locks: { ...defaults.feature_locks, ...(source.config?.feature_locks || {}) },
  };
  source.usage ||= {};
  for (const store of ['users', 'projects', 'documents', 'chats', 'analyses', 'translations', 'glossaries', 'translationMemory', 'translationJobs', 'careerProfiles', 'resumes', 'careerDocuments', 'brandKits', 'businessAssets', 'mediaAssets']) source[store] ||= {};
  if (!Array.isArray(source.aiProviderRequests)) source.aiProviderRequests = [];
  return applyPlatformMigration(source).db;
}
