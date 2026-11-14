/**
 * Client-side Romanized Hindi → Devanagari transliteration.
 * Converts common phonetic English spellings of Hindi words to Devanagari script.
 * Applied onBlur when lang === 'hi' and input contains only ASCII characters.
 */

// Syllable map ordered longest-first to greedily match multi-char sequences
const MAP: [string, string][] = [
  // Aspirated consonants (must come before non-aspirated)
  ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["chh", "छ"], ["jh", "झ"],
  ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"],
  ["sh", "श"], ["shh", "ष"],

  // Consonants
  ["k", "क"], ["g", "ग"], ["c", "च"], ["j", "ज"], ["t", "त"],
  ["d", "द"], ["n", "न"], ["p", "प"], ["b", "ब"], ["m", "म"],
  ["y", "य"], ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"],
  ["s", "स"], ["h", "ह"], ["f", "फ"], ["z", "ज"], ["q", "क"],

  // Vowels (standalone)
  ["aa", "आ"], ["ii", "ई"], ["uu", "ऊ"], ["ai", "ऐ"], ["au", "औ"],
  ["a", "अ"], ["i", "इ"], ["u", "उ"], ["e", "ए"], ["o", "ओ"],
];

// Common full-word shortcuts
const WORD_MAP: Record<string, string> = {
  mera: "मेरा", meri: "मेरी", mere: "मेरे",
  hamara: "हमारा", humara: "हमारा",
  pani: "पानी", paani: "पानी",
  bijli: "बिजली", sadak: "सड़क",
  nahi: "नहीं", nahin: "नहीं", nai: "नहीं",
  aa: "आ", hai: "है", hain: "हैं", tha: "था", thi: "थी",
  raha: "रहा", rahi: "रही", rahe: "रहे",
  kar: "कर", karo: "करो", karna: "करना",
  ghar: "घर", mohalla: "मोहल्ला",
  shikayat: "शिकायत", samasya: "समस्या",
  kripaya: "कृपया", dhanyavad: "धन्यवाद",
  abhi: "अभी", yahan: "यहाँ", wahan: "वहाँ",
  bohot: "बहुत", bahut: "बहुत", bada: "बड़ा",
  kal: "कल", aaj: "आज",
};

/**
 * Transliterate a single word from Romanized Hindi to Devanagari.
 * If the word is already in Devanagari or another non-ASCII script, return as-is.
 */
function transliterateWord(word: string): string {
  // If word already has Devanagari or other non-ASCII, skip
  if (/[^\x00-\x7F]/.test(word)) return word;

  const lower = word.toLowerCase();

  // Check full-word map first
  if (WORD_MAP[lower]) return WORD_MAP[lower];

  // Greedy phonetic conversion
  let result = "";
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    // Try longest match first
    for (const [roman, deva] of MAP) {
      if (lower.startsWith(roman, i)) {
        result += deva;
        i += roman.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Keep unknown characters as-is (spaces, punctuation, numbers)
      result += lower[i];
      i++;
    }
  }
  return result;
}

/**
 * Transliterate an entire sentence.
 * Splits on word boundaries, transliterates each word, rejoins.
 */
export function transliterate(text: string): string {
  if (!text.trim()) return text;
  // If text already has significant Devanagari content, don't re-transliterate
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  if (totalChars > 0 && devanagariChars / totalChars > 0.3) return text;

  return text
    .split(/(\s+)/)
    .map((token) => {
      // Preserve whitespace tokens
      if (/^\s+$/.test(token)) return token;
      // Preserve pure numbers and punctuation
      if (/^[\d.,!?;:'"()\-]+$/.test(token)) return token;
      return transliterateWord(token);
    })
    .join("");
}

/**
 * Returns true if the text contains only ASCII characters (no Devanagari).
 * Used to decide whether to offer transliteration.
 */
export function isRomanizedHindi(text: string): boolean {
  return text.trim().length > 0 && !/[^\x00-\x7F]/.test(text);
}
