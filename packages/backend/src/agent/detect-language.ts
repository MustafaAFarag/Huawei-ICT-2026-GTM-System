import type { ToolRequest } from "@revenue/contracts";

// Content language from the person's own words, used when neither the model nor the UI
// set one. Arabic script picks Arabic; dialect markers pick the Egyptian or Gulf register;
// otherwise Modern Standard business Arabic. An explicit "in English/بالعربي" wins.
const EGYPTIAN =
  /(?:^|[\s،,.؟?!])(?:عايز|عايزين|عاوز|ازاي|إزاي|كده|كدا|بتاع|بتاعة|بتاعنا|ده|دي|دول|مش|إحنا|احنا|خلّي|خلي|علشان|عشان|لسه|بقى|أوي|اوي|حاجة|حاجات)(?=$|[\s،,.؟?!])/;
const GULF =
  /(?:^|[\s،,.؟?!])(?:ابغى|أبغى|ابي|أبي|نبغى|ودي|وش|ايش|إيش|زين|حياك|هالحين|الحين|مب|مو|واجد|يبغى|شلون|عطني|سوّ|سوي)(?=$|[\s،,.؟?!])/;

export function detectLanguage(text: string): ToolRequest["language"] {
  if (/\b(?:in|to) english\b|بالإنجليزي|بالانجليزي|بالإنجليزية|بالانجليزية/i.test(text)) return "en";
  const asksArabic = /\b(?:in|to) arabic\b|بالعربي|بالعربية/i.test(text);
  // Dialect names count only as a language request ("in Egyptian Arabic", "بالمصري"),
  // not as a market ("accounts in Saudi Arabia").
  if (/\begyptian arabic\b|بالمصري|باللهجة المصرية/i.test(text)) return "ar-EG";
  if (/\b(?:gulf|saudi|khaleeji) arabic\b|بالخليجي|بالسعودي|باللهجة الخليجية/i.test(text)) return "ar-Gulf";
  if (!asksArabic && !/[؀-ۿ]/.test(text)) return "en";
  if (EGYPTIAN.test(text)) return "ar-EG";
  if (GULF.test(text)) return "ar-Gulf";
  return "ar";
}
