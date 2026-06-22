const { searchKnowledge } = require('./embeddingService');
const { generateAnswer } = require('./openaiService');
const intentService = require('./intentService');
const leadService = require('./leadService');
const prisma = require('../database/prisma');
const { sanitizeInput, hasInjection } = require('../utils/sanitize');
const { detectLanguage } = require('../utils/language');
const { getGuildSettings } = require('./settingsService');
const { shouldEscalateToHuman, notifySupportChannel, applyBehaviorRoles } = require('./supportService');
const { saveUnansweredQuestion } = require('./unansweredService');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Full RAG pipeline: detect intent → retrieve context → generate answer → save logs → update lead.
 *
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.guildId
 * @param {string} params.channelId
 * @param {string} params.userId
 * @param {string} params.username
 * @param {string} params.displayName
 * @param {object} [params.client]
 * @param {boolean} [params.isTicket]
 * @returns {Promise<{
 *   answer: string,
 *   intent: string,
 *   confidence: number,
 *   isOfficialRule: boolean,
 *   sourceName: string|null,
 *   sourceUrl: string|null,
 *   matchedChunkIds: string[],
 * }>}
 */
async function processQuestion({
  question, guildId, channelId, userId, username, displayName, client = null, isTicket = false,
}) {
  const clean = sanitizeInput(question, 800);
  const language = detectLanguage(clean);
  let settings = null;
  try {
    settings = await getGuildSettings(guildId);
  } catch(e) {
    // In DM or if guild settings missing, we ignore
  }

  if (hasInjection(clean)) {
    const safeAnswer = "I'm here to help with FundedCobra questions only. I can't assist with that request.";
    return {
      answer: safeAnswer, intent: 'injection_attempt',
      confidence: 0, isOfficialRule: false,
      sourceName: null, sourceUrl: null, matchedChunkIds: [],
      language,
    };
  }

  const intent = intentService.detectIntent(clean);
  const handoff = shouldEscalateToHuman(clean, intent, 0);

  // Search using guildId filter and keyword fallback if needed
  let results = [];
  try {
    results = await searchKnowledge(clean, guildId, env.RAG_TOP_K);
  } catch(e) {
    logger.error('Failed to search knowledge base', e);
  }

  const topScore = results[0]?.score ?? 0;
  const hasContext = topScore >= env.RAG_MIN_CONFIDENCE;

  let contextText = '';
  let matchedSourceId = null;
  let sourceName = null;
  let sourceUrl = null;
  const matchedChunkIds = [];

  if (hasContext) {
    const relevantResults = results.filter(r => r.score >= env.RAG_MIN_CONFIDENCE);
    contextText = relevantResults
      .map((r, i) => {
        const { chunk } = r;
        matchedChunkIds.push(chunk.id);
        if (i === 0) {
          matchedSourceId = chunk.sourceId;
          sourceName = chunk.source?.title || 'FundedCobra Knowledge Base';
          sourceUrl  = chunk.source?.url   || null;
        }
        return `[${i + 1}] ${chunk.title}${chunk.section ? ` — ${chunk.section}` : ''}\n${chunk.content}`;
      })
      .join('\n\n');
  }

  if ((handoff.escalate || !hasContext) && client && settings) {
    await notifySupportChannel(client, guildId, {
      question: clean,
      reason: handoff.reason || 'low-confidence answer',
      category: handoff.category,
      username,
    }).catch(() => {});

    if (handoff.escalate) {
      await applyBehaviorRoles(client, guildId, userId, ['Needs Support']).catch(() => {});
    }
  }

  if (!hasContext || handoff.escalate) {
    await saveUnansweredQuestion({
      guildId,
      userId,
      username,
      question: clean,
      intent,
      confidence: topScore,
      language,
      sourceName,
      sourceUrl,
    }).catch(() => {});
  }

  let answer;
  try {
    if (handoff.escalate && !isTicket) {
      answer = "I’m escalating this to the FundedCobra support team so a human can review it directly. Please use the ticket button below or contact support@fundedcobra.com for immediate help.";
    } else {
      answer = await generateAnswer(clean, contextText, intent, hasContext, language, isTicket);
    }
  } catch (err) {
    logger.error('OpenAI error in RAG pipeline:', err);
    answer = "AI support is temporarily unavailable. Please contact FundedCobra support. @fundedcobra";
  }

  const confidence = topScore;

  try {
    await prisma.questionLog.create({
      data: {
        guildId, channelId, userId, username, question: clean, answer,
        intent, confidence, matchedSourceId,
        matchedChunkIds: JSON.stringify(matchedChunkIds),
        language,
      },
    });
  } catch (err) {
    logger.error('Failed to log question:', err);
  }

  try {
    await leadService.processInteraction({
      guildId, userId, username, displayName, question: clean, answer, intent, client,
    });
  } catch (err) {
    logger.error('Failed to update lead:', err);
  }

  if (settings && settings.dmFollowupEnabled && client && ['pricing', 'challenge', 'account', 'payment', 'payout', 'coupon', 'objection'].includes(intent)) {
    const lead = await prisma.lead.findUnique({ where: { guildId_userId: { guildId, userId } } }).catch(() => null);
    const cooldownHours = settings.dmFollowupCooldownHours || 24;
    const lastFollowup = lead?.lastFollowupAt ? new Date(lead.lastFollowupAt).getTime() : 0;
    const canDm = !lastFollowup || (Date.now() - lastFollowup) >= cooldownHours * 60 * 60 * 1000;

    if (canDm) {
      const dmText = language === 'ur'
        ? 'Salam! Agar aap pricing, account ya payment ke bare mein help chahte hain to main assist kar sakta hoon. Bas reply kar dein.'
        : language === 'roman-ur'
          ? 'Salam! Agar aap pricing, account ya payment ke bare mein help chahte hain to main assist kar sakta hoon. Bas reply kar dein.'
          : 'Hi! If you want help with pricing, account options, or payment, reply here and I’ll guide you through it.';

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send(dmText).catch(() => {});
        if (lead) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { lastFollowupAt: new Date() },
          }).catch(() => {});
        }
      }
    }
  }

  return {
    answer, intent, confidence,
    isOfficialRule: topScore >= env.RAG_CONFIDENCE_THRESHOLD,
    sourceName, sourceUrl, matchedChunkIds,
    language,
  };
}

module.exports = { processQuestion };
