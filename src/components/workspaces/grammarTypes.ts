export interface SuggestionCard {
  id: string;
  original: string;
  suggested: string;
  type: 'Grammar' | 'Spelling' | 'Punctuation' | 'Clarity' | 'Style' | 'Tone' | 'Premium';
  desc: string;
  explanation?: string;
  isPremium?: boolean;
}

export interface DiffChunk {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

export interface WritingScores {
  overall: number;
  grammar: number;
  spelling: number;
  clarity: number;
  readability: number;
  tone: number;
  conciseness: number;
  professionalism: number;
}

export interface ReadabilityMetrics {
  readingLevel: string;
  readingTime: number; // in seconds
  sentenceLength: number; // average sentence length in words
  wordLength: number; // average word length in characters
  paragraphDensity: string; // e.g. "Optimal", "High", "Low"
}

export interface ToneAnalysis {
  dominantTone: string;
  scores: {
    Professional: number;
    Friendly: number;
    Formal: number;
    Casual: number;
    Confident: number;
    Empathetic: number;
    Persuasive: number;
    Academic: number;
    Business: number;
  };
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalText: string;
  correctedText: string;
  score: number;
  isFavorite: boolean;
  suggestionsCount: number;
}

export interface AdminConfig {
  grammarRulesEnabled: boolean;
  premiumRulesEnabled: boolean;
  suggestionLimit: number;
  dailyLimit: number;
  supportedLanguages: string[];
  featureFlags: {
    realTimeChecking: boolean;
    toneAnalysis: boolean;
    readabilityScore: boolean;
    compareMode: boolean;
  };
}
