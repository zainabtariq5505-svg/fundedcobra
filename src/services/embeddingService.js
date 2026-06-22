const prisma = require('../database/prisma');
const { generateEmbedding, generateEmbeddingsBatch } = require('./openaiService');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Computes cosine similarity between two float arrays.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Similarity score 0–1
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Searches knowledge base chunks using cosine similarity.
 * @param {string} query - User's question text
 * @param {string} guildId - The guild ID to filter by
 * @param {number} [topK] - Number of top results to return
 * @returns {Promise<{ chunk: object, score: number }[]>}
 */
async function searchKnowledge(query, guildId, topK = env.RAG_TOP_K) {
  let queryEmbedding = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (err) {
    logger.warn('Failed to generate query embedding, falling back to keyword search:', err.message);
  }

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { guildId },
    include: { source: { select: { title: true, url: true, type: true } } },
  });

  if (chunks.length === 0) return [];

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  const scored = chunks
    .map(chunk => {
      let score = 0;
      if (queryEmbedding && chunk.embedding) {
        try {
          const embedding = JSON.parse(chunk.embedding);
          score = cosineSimilarity(queryEmbedding, embedding);
        } catch {
          // Ignore
        }
      } else {
        // Keyword fallback scoring
        const textToSearch = `${chunk.title} ${chunk.section || ''} ${chunk.content}`.toLowerCase();
        let matchCount = 0;
        for (const term of queryTerms) {
          if (textToSearch.includes(term)) matchCount++;
        }
        score = queryTerms.length > 0 ? (matchCount / queryTerms.length) * 0.6 : 0;
      }
      return { chunk, score };
    })
    .filter(r => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Stores embedding for a specific chunk by ID.
 * @param {string} chunkId
 * @param {number[]} embedding
 */
async function saveEmbedding(chunkId, embedding) {
  await prisma.knowledgeChunk.update({
    where: { id: chunkId },
    data: { embedding: JSON.stringify(embedding) },
  });
}

/**
 * Generates and saves embeddings for all chunks missing them.
 * @returns {Promise<number>} Count of chunks processed
 */
async function embedMissingChunks() {
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { embedding: null },
    select: { id: true, content: true, title: true, section: true },
  });

  if (chunks.length === 0) return 0;

  logger.info(`Embedding ${chunks.length} chunks...`);

  const texts = chunks.map(c => `${c.title}${c.section ? ` — ${c.section}` : ''}\n${c.content}`);
  const embeddings = await generateEmbeddingsBatch(texts);

  // Save all embeddings
  await Promise.all(
    chunks.map((chunk, i) =>
      prisma.knowledgeChunk.update({
        where: { id: chunk.id },
        data: { embedding: JSON.stringify(embeddings[i]) },
      })
    )
  );

  logger.info(`Embedded ${chunks.length} chunks successfully.`);
  return chunks.length;
}

module.exports = { cosineSimilarity, searchKnowledge, saveEmbedding, embedMissingChunks };
