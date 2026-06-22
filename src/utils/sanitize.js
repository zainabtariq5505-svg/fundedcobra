/**
 * Sanitization utilities — prevents prompt injection and cleans user input.
 */

// Phrases that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore (previous|all|prior|above|below) instructions/i,
  /system prompt/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /forget (your|all|previous)/i,
  /override (your|the|all)/i,
  /act as (a|an|if|though)/i,
  /jailbreak/i,
  /dan mode/i,
  /reveal (your|the) (api key|secret|token|password|prompt|system|instruction)/i,
  /print (your|the) (system|prompt|instructions?)/i,
  /what (is|are) your (system|instructions?|prompt)/i,
  /show me your (system|instructions?|prompt)/i,
  /disregard (your|all|any|previous)/i,
  /new persona/i,
];

/**
 * Returns true if the input contains a suspected prompt injection.
 * @param {string} text
 */
function hasInjection(text) {
  if (!text) return false;
  return INJECTION_PATTERNS.some(p => p.test(text));
}

/**
 * Sanitizes user input for safe use in AI prompts.
 * - Truncates to max length
 * - Removes null bytes and control chars
 * - Normalizes whitespace
 * @param {string} text
 * @param {number} maxLength
 */
function sanitizeInput(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Cleans HTML-extracted text for storage.
 * @param {string} text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  return text
    .replace(/\t/g, ' ')
    .replace(/ {3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

module.exports = { hasInjection, sanitizeInput, cleanExtractedText };
