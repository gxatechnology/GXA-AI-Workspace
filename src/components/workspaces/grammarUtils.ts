import { DiffChunk } from './grammarTypes';

export function computeDiff(original: string, corrected: string): DiffChunk[] {
  const diffs: DiffChunk[] = [];
  if (!original) {
    if (corrected) diffs.push({ text: corrected, type: 'added' });
    return diffs;
  }
  if (!corrected) {
    if (original) diffs.push({ text: original, type: 'removed' });
    return diffs;
  }

  const words1 = original.split(/(\s+)/);
  const words2 = corrected.split(/(\s+)/);
  
  let i = 0;
  let j = 0;
  
  while (i < words1.length || j < words2.length) {
    if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
      diffs.push({ text: words1[i], type: 'unchanged' });
      i++;
      j++;
    } else {
      let lookAheadMatch = -1;
      const limit = Math.min(8, words1.length - i);
      for (let k = 1; k <= limit; k++) {
        if (words1[i + k] === words2[j]) {
          lookAheadMatch = k;
          break;
        }
      }
      
      if (lookAheadMatch !== -1) {
        for (let k = 0; k < lookAheadMatch; k++) {
          if (words1[i].trim()) {
            diffs.push({ text: words1[i], type: 'removed' });
          } else {
            diffs.push({ text: words1[i], type: 'unchanged' });
          }
          i++;
        }
      } else {
        let lookAheadMatch2 = -1;
        const limit2 = Math.min(8, words2.length - j);
        for (let k = 1; k <= limit2; k++) {
          if (words2[j + k] === words1[i]) {
            lookAheadMatch2 = k;
            break;
          }
        }
        
        if (lookAheadMatch2 !== -1) {
          for (let k = 0; k < lookAheadMatch2; k++) {
            if (words2[j].trim()) {
              diffs.push({ text: words2[j], type: 'added' });
            } else {
              diffs.push({ text: words2[j], type: 'unchanged' });
            }
            j++;
          }
        } else {
          if (i < words1.length) {
            if (words1[i].trim()) {
              diffs.push({ text: words1[i], type: 'removed' });
            } else {
              diffs.push({ text: words1[i], type: 'unchanged' });
            }
            i++;
          }
          if (j < words2.length) {
            if (words2[j].trim()) {
              diffs.push({ text: words2[j], type: 'added' });
            } else {
              diffs.push({ text: words2[j], type: 'unchanged' });
            }
            j++;
          }
        }
      }
    }
  }
  return diffs;
}

export function detectLanguage(text: string): string {
  if (!text || text.trim().length < 5) return 'English';
  
  // Quick checks
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi (Devanagari)';
  if (/[\u0400-\u04FF]/.test(text)) return 'Russian (Cyrillic)';
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return 'Japanese / Chinese';
  
  const lower = text.toLowerCase();
  
  // Common language trigger words
  const fr = /\b(le|la|les|un|une|des|et|en|que|est|dans|pour|avec)\b/g.test(lower);
  const es = /\b(el|la|los|un|una|y|que|en|es|para|con|por|este|esta)\b/g.test(lower);
  const de = /\b(der|die|das|und|ein|eine|ist|in|zu|mit|von|für|dass)\b/g.test(lower);
  const it = /\b(il|la|i|un|una|e|che|in|è|per|con|di|da|questo|questa)\b/g.test(lower);
  
  if (fr) return 'French';
  if (es) return 'Spanish';
  if (de) return 'German';
  if (it) return 'Italian';
  
  return 'English';
}

export function getReadingLevel(wordCount: number, sentenceCount: number, charCount: number): string {
  if (wordCount < 10) return 'Too short';
  // Automated readability index approximate
  const avgSentence = sentenceCount > 0 ? wordCount / sentenceCount : wordCount;
  const avgWord = charCount / wordCount;
  
  const score = 4.71 * avgWord + 0.5 * avgSentence - 21.43;
  
  if (score < 4) return 'Elementary';
  if (score < 7) return 'Middle School';
  if (score < 10) return 'High School';
  if (score < 13) return 'College Level';
  return 'Academic / Professional';
}

export function getParagraphDensity(text: string, paragraphCount: number): string {
  if (!text) return 'N/A';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (paragraphCount <= 1) return 'Low';
  
  const avgParagraphWords = words / paragraphCount;
  if (avgParagraphWords < 40) return 'Low Density';
  if (avgParagraphWords <= 120) return 'Optimal Density';
  return 'High Density';
}
