const URDU_SCRIPT_RE = /[\u0600-\u06FF]/;
const ROMAN_URDU_HINTS = [
  'kya', 'kyun', 'kyu', 'hai', 'hain', 'nahi', 'nahin', 'mujhe', 'mera', 'meri',
  'aap', 'tum', 'hum', 'chahiye', 'kab', 'kaise', 'kahaan', 'kahan', 'paisa',
  'payout', 'refund', 'discount', 'coupon', 'payment', 'buy', 'price', 'pricing',
];

function detectLanguage(text) {
  if (!text) return 'en';

  const hasUrduScript = URDU_SCRIPT_RE.test(text);
  const latinText = text.replace(/[^A-Za-z\s]/g, ' ').toLowerCase();
  const romanHits = ROMAN_URDU_HINTS.filter(word => latinText.includes(word)).length;
  const hasLatinLetters = /[A-Za-z]/.test(text);

  if (hasUrduScript && hasLatinLetters) return 'mixed-ur-en';
  if (hasUrduScript) return 'ur';
  if (romanHits >= 2) return 'roman-ur';
  return 'en';
}

function languageInstruction(language) {
  const map = {
    ur: 'Respond in Urdu.',
    'roman-ur': 'Respond in Roman Urdu using Latin script.',
    'mixed-ur-en': 'Respond in the same mixed Urdu/English style as the user.',
    en: 'Respond in English.',
  };

  return map[language] || map.en;
}

module.exports = { detectLanguage, languageInstruction };
