const crypto = require('crypto');
const prisma = require('../database/prisma');
const { crawlWebsite, scrapeSingleUrl } = require('./websiteScraperService');
const { generateEmbeddingsBatch } = require('./openaiService');
const { chunkBySections } = require('../utils/chunkText');
const { cleanExtractedText } = require('../utils/sanitize');
const logger = require('../utils/logger');

/**
 * Computes a SHA-256 hash of text content.
 * Used to detect duplicate imports.
 * @param {string} text
 */
function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function saveRuleVersion(source) {
  if (!source) return;

  const versionNumber = await prisma.ruleVersion.count({ where: { sourceId: source.id } }) + 1;
  await prisma.ruleVersion.create({
    data: {
      sourceId: source.id,
      versionNumber,
      title: source.title,
      url: source.url,
      rawText: source.rawText || '',
      contentHash: source.contentHash,
      createdBy: source.importedBy,
    },
  });
}

/**
 * Imports chunks for a single source document.
 * Creates the source record and all embedded chunks.
 *
 * @param {object} params
 * @param {string} params.guildId
 * @param {string} params.type - url | text | markdown | json | website | manual
 * @param {string} params.title
 * @param {string} params.rawText
 * @param {string|null} params.url
 * @param {string} params.importedBy - Discord admin user ID
 * @param {boolean} [params.force] - Re-import even if hash matches
 * @returns {Promise<{ source: object, chunksCreated: number, skipped: boolean }>}
 */
async function importSource({ guildId, type, title, rawText, url = null, importedBy, force = false }) {
  const cleaned = cleanExtractedText(rawText);
  const contentHash = hashContent(cleaned);

  // Check for existing source with same hash
  const existing = await prisma.knowledgeSource.findFirst({ where: { contentHash } });
  if (existing && !force) {
    return { source: existing, chunksCreated: 0, skipped: true };
  }

  // Delete old version if re-importing (same URL)
  if (url) {
    const oldByUrl = await prisma.knowledgeSource.findFirst({ where: { url } });
    if (oldByUrl) {
      await saveRuleVersion(oldByUrl);
      await prisma.knowledgeSource.delete({ where: { id: oldByUrl.id } });
    }
  }

  if (existing && force) {
    await saveRuleVersion(existing);
    await prisma.knowledgeSource.delete({ where: { id: existing.id } }).catch(() => {});
  }

  // Create source record
  const source = await prisma.knowledgeSource.create({
    data: { guildId, type, title, url, rawText: cleaned, contentHash, importedBy },
  });

  // Chunk the text
  const chunks = chunkBySections(cleaned, title);
  if (chunks.length === 0) {
    return { source, chunksCreated: 0, skipped: false };
  }

  // Generate embeddings for all chunks
  const texts = chunks.map(c => `${c.title}${c.section ? ` — ${c.section}` : ''}\n${c.content}`);
  let embeddings = [];
  try {
    embeddings = await generateEmbeddingsBatch(texts);
  } catch (err) {
    logger.error('Embedding generation failed during import:', err);
    // Still save chunks without embeddings — can be re-embedded later
    embeddings = new Array(chunks.length).fill(null);
  }

  // Save chunks
  await prisma.knowledgeChunk.createMany({
    data: chunks.map((chunk, i) => ({
      guildId,
      sourceId:   source.id,
      title:      chunk.title,
      section:    chunk.section || null,
      content:    chunk.content,
      embedding:  embeddings[i] ? JSON.stringify(embeddings[i]) : null,
      url:        url || null,
      chunkIndex: i,
    })),
  });

  logger.info(`Imported source "${title}" — ${chunks.length} chunks created.`);
  return { source, chunksCreated: chunks.length, skipped: false };
}

/**
 * Imports content from a URL (single page).
 */
async function importFromUrl(guildId, url, importedBy) {
  const { title, text } = await scrapeSingleUrl(url);
  return importSource({ guildId, type: 'url', title, rawText: text, url, importedBy });
}

/**
 * Imports raw text/markdown provided by an admin.
 */
async function importFromText(guildId, text, title, importedBy, type = 'manual') {
  return importSource({ guildId, type, title, rawText: text, url: null, importedBy });
}

/**
 * Imports from a JSON FAQ array: [{ question, answer }] or [{ q, a }]
 */
async function importFromJsonFaq(guildId, jsonText, title, importedBy) {
  let faqs;
  try {
    faqs = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON. Expected an array of FAQ objects: [{ "question": "...", "answer": "..." }]');
  }
  if (!Array.isArray(faqs)) throw new Error('JSON must be an array.');

  const lines = faqs.map((item, i) => {
    const q = item.question || item.q || item.Q || `FAQ ${i + 1}`;
    const a = item.answer   || item.a || item.A || '';
    return `Q: ${q}\nA: ${a}`;
  }).join('\n\n');

  return importSource({ guildId, type: 'json', title, rawText: lines, url: null, importedBy });
}

/**
 * Crawls the whole FundedCobra website and imports all pages.
 * Returns an array of import results.
 */
async function syncWebsite(guildId, startUrl, importedBy) {
  const pages = await crawlWebsite(startUrl);
  const results = [];

  for (const page of pages) {
    try {
      const result = await importSource({
        guildId, type: 'website', title: page.title,
        rawText: page.text, url: page.url, importedBy,
      });
      results.push({ url: page.url, title: page.title, ...result });
    } catch (err) {
      logger.error(`Failed to import page ${page.url}:`, err);
      results.push({ url: page.url, title: page.title, error: err.message });
    }
  }

  return results;
}

/**
 * Deletes a knowledge source and all its chunks (cascade).
 */
async function deleteSource(sourceId) {
  return prisma.knowledgeSource.delete({ where: { id: sourceId } });
}

/**
 * Lists all knowledge sources with chunk counts.
 */
async function listSources() {
  return prisma.knowledgeSource.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chunks: true } } },
  });
}

/**
 * Gets a single source with its chunks.
 */
async function getSource(id) {
  return prisma.knowledgeSource.findUnique({
    where: { id },
    include: { chunks: { select: { id: true, section: true, content: true, chunkIndex: true } } },
  });
}

async function getRuleHistory(sourceId) {
  return prisma.ruleVersion.findMany({
    where: { sourceId },
    orderBy: { versionNumber: 'desc' },
  });
}

async function compareRuleVersions(oldVersionId, newVersionId) {
  const [oldVersion, newVersion] = await Promise.all([
    prisma.ruleVersion.findUnique({ where: { id: oldVersionId } }),
    prisma.ruleVersion.findUnique({ where: { id: newVersionId } }),
  ]);

  if (!oldVersion || !newVersion) {
    throw new Error('One or both rule versions were not found.');
  }

  const oldLines = (oldVersion.rawText || '').split(/\r?\n/).filter(Boolean);
  const newLines = (newVersion.rawText || '').split(/\r?\n/).filter(Boolean);
  const oldPreview = oldLines.slice(0, 12).join('\n');
  const newPreview = newLines.slice(0, 12).join('\n');

  return {
    oldVersion,
    newVersion,
    summary: {
      oldLines: oldLines.length,
      newLines: newLines.length,
      lineDelta: newLines.length - oldLines.length,
      oldPreview,
      newPreview,
    },
  };
}

module.exports = {
  importFromUrl, importFromText, importFromJsonFaq,
  syncWebsite, deleteSource, listSources, getSource, importSource,
  getRuleHistory, compareRuleVersions,
};
