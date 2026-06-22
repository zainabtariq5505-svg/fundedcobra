/**
 * Splits text into overlapping chunks suitable for embedding.
 * Uses word-boundary splitting to avoid cutting mid-word.
 *
 * @param {string} text - Input text
 * @param {number} chunkSize - Target words per chunk
 * @param {number} overlap - Overlap words between chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 300, overlap = 50) {
  if (!text || text.trim().length === 0) return [];

  const words = text.trim().split(/\s+/);
  if (words.length <= chunkSize) return [text.trim()];

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += chunkSize - overlap;
  }

  return chunks.filter(c => c.trim().length > 20);
}

/**
 * Splits HTML-cleaned text by section headings first,
 * then further chunks large sections.
 *
 * @param {string} text
 * @param {number} maxWords
 * @returns {{ title: string, section: string, content: string }[]}
 */
function chunkBySections(text, title = 'Document', maxWords = 300) {
  // Split on heading patterns
  const sectionPattern = /\n(?=#{1,3}\s|\*{2}[A-Z])/;
  const rawSections = text.split(sectionPattern).filter(s => s.trim().length > 30);

  const results = [];

  for (const section of rawSections) {
    const lines = section.split('\n');
    const sectionTitle = lines[0].replace(/^#{1,3}\s*/, '').replace(/\*+/g, '').trim();
    const content = lines.slice(1).join('\n').trim() || section.trim();

    const subChunks = chunkText(content, maxWords, 40);
    subChunks.forEach((chunk, i) => {
      results.push({
        title,
        section: sectionTitle || `Section ${results.length + 1}`,
        content: chunk,
      });
    });
  }

  // Fallback: no sections found, chunk the whole text
  if (results.length === 0) {
    const chunks = chunkText(text, maxWords, 40);
    chunks.forEach((chunk, i) => {
      results.push({ title, section: `Part ${i + 1}`, content: chunk });
    });
  }

  return results;
}

module.exports = { chunkText, chunkBySections };
