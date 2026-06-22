const prisma = require('../database/prisma');
const { isLeadQuestion, scoreIntent } = require('./intentService');
const logger = require('../utils/logger');
const { sendHotLeadAlert, applyBehaviorRoles } = require('./supportService');

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function leadStatusFromScore(score) {
  if (score >= 61) return 'hot';
  if (score >= 31) return 'warm';
  return 'new';
}

function scoreQuestion(question, intent, questionCount24h = 0) {
  const text = (question || '').toLowerCase();
  let score = 0;

  const scoreIfAny = (keywords, value) => {
    if (keywords.some(keyword => text.includes(keyword))) score += value;
  };

  scoreIfAny(['price', 'pricing', 'cost', 'how much', 'fee'], 20);
  scoreIfAny(['how to buy', 'buy', 'purchase', 'checkout', 'checkout link', 'link to buy'], 30);
  scoreIfAny(['payment method', 'how to pay', 'pay with', 'card', 'crypto', 'bank transfer', 'wire'], 25);
  scoreIfAny(['coupon', 'discount', 'promo code', 'code'], 15);
  scoreIfAny(['payout', 'withdraw', 'withdrawal', 'cash out', 'profit split'], 10);
  scoreIfAny(['account size', '$10k', '$25k', '$50k', '$100k', '$200k', 'funded account'], 15);
  scoreIfAny(['link', 'checkout', 'payment link', 'order now'], 40);

  if (questionCount24h >= 2) {
    score += 20;
  }

  if (score === 0 && isLeadQuestion(question, intent)) {
    score = scoreIntent(intent, true) > 0 ? Math.min(30, scoreIntent(intent, true)) : 10;
  }

  return clampScore(score);
}

/**
 * Creates or updates a lead record after every interaction.
 * @param {object} params
 */
async function processInteraction({ guildId, userId, username, displayName, question, answer, intent, client = null }) {
  try {
    const isLead = isLeadQuestion(question, intent);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const questionCount24h = await prisma.questionLog.count({
      where: { guildId, userId, createdAt: { gte: since } },
    }).catch(() => 0);
    const scoreDelta = scoreQuestion(question, intent, questionCount24h);

    const existing = await prisma.lead.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    const nextScore = clampScore((existing?.score || 0) + scoreDelta);
    const nextStatus = leadStatusFromScore(nextScore);

    if (existing) {
      const previousStatus = existing.status;
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          username,
          displayName: displayName || existing.displayName,
          lastQuestion: question,
          lastAnswer:   answer,
          intentSummary: intent,
          updatedAt: new Date(),
          isLead: existing.isLead || isLead,
          score: nextScore,
          status: existing.status === 'closed' || existing.status === 'ignored' ? existing.status : nextStatus,
        },
      });

      if (client && previousStatus !== 'hot' && nextStatus === 'hot' && existing.status !== 'closed' && existing.status !== 'ignored') {
        await sendHotLeadAlert(client, guildId, {
          ...existing,
          username,
          userId,
          score: nextScore,
          status: nextStatus,
        }, {
          questionCount24h,
          suggestedAction: 'Reach out quickly with a personalized buying conversation and answer any remaining objections.',
        });
      }

      if (client) {
        await applyBehaviorRoles(client, guildId, userId, [
          'Interested Trader',
          nextStatus === 'hot' ? 'Hot Lead' : nextStatus === 'warm' ? 'Warm Lead' : null,
        ].filter(Boolean));
      }
    } else {
      const lead = await prisma.lead.create({
        data: {
          guildId, userId, username,
          displayName: displayName || username,
          firstQuestion: question,
          lastQuestion:  question,
          lastAnswer:    answer,
          intentSummary: intent,
          isLead,
          score: nextScore,
          status: nextStatus,
        },
      });

      if (client && nextStatus === 'hot') {
        await sendHotLeadAlert(client, guildId, lead, {
          questionCount24h,
          suggestedAction: 'Reach out quickly with a personalized buying conversation and answer any remaining objections.',
        });
      }

      if (client) {
        await applyBehaviorRoles(client, guildId, userId, [
          'Interested Trader',
          nextStatus === 'hot' ? 'Hot Lead' : nextStatus === 'warm' ? 'Warm Lead' : null,
        ].filter(Boolean));
      }
    }
  } catch (err) {
    logger.error('leadService.processInteraction error:', err);
  }
}

/**
 * Updates a lead's status by Discord user ID within a guild.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} status - new | warm | hot | closed | ignored
 */
async function setLeadStatus(guildId, userId, status) {
  const valid = ['new', 'warm', 'hot', 'closed', 'ignored'];
  if (!valid.includes(status)) throw new Error(`Invalid status: ${status}. Must be: ${valid.join(', ')}`);

  return prisma.lead.update({
    where: { guildId_userId: { guildId, userId } },
    data: { status, updatedAt: new Date() },
  });
}

/**
 * Adds a note to a lead.
 * @param {string} leadId
 * @param {string} note
 * @param {string} addedBy - Discord user ID of the admin
 */
async function addLeadNote(leadId, note, addedBy) {
  return prisma.leadNote.create({ data: { leadId, note, addedBy } });
}

/**
 * Finds a lead by Discord user ID (mention, ID, or username).
 * @param {string} guildId
 * @param {string} query - user ID, @mention, or username
 */
async function findLead(guildId, query) {
  const userId = query.replace(/[<@!>]/g, '');

  // Try by userId first
  let lead = await prisma.lead.findUnique({
    where: { guildId_userId: { guildId, userId } },
    include: { notes: { orderBy: { createdAt: 'desc' } } },
  });

  // Fallback: search by username
  if (!lead) {
    lead = await prisma.lead.findFirst({
      where: { guildId, username: { contains: query } },
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    });
  }

  return lead;
}

/**
 * Returns paginated leads for a guild.
 * @param {string} guildId
 * @param {object} opts
 */
async function getLeads(guildId, { status, limit = 20, offset = 0 } = {}) {
  return prisma.lead.findMany({
    where: { guildId, ...(status ? { status } : {}), isLead: true },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    skip: offset,
    include: { notes: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
}

/**
 * Searches leads by keyword in username or questions.
 * @param {string} guildId
 * @param {string} keyword
 */
async function searchLeads(guildId, keyword) {
  return prisma.lead.findMany({
    where: {
      guildId,
      OR: [
        { username:      { contains: keyword } },
        { displayName:   { contains: keyword } },
        { firstQuestion: { contains: keyword } },
        { lastQuestion:  { contains: keyword } },
        { intentSummary: { contains: keyword } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 25,
    include: { notes: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
}

/**
 * Returns total counts for stats.
 */
async function getLeadStats(guildId) {
  const [total, hot, warm, newCount] = await Promise.all([
    prisma.lead.count({ where: { guildId, isLead: true } }),
    prisma.lead.count({ where: { guildId, status: 'hot' } }),
    prisma.lead.count({ where: { guildId, status: 'warm' } }),
    prisma.lead.count({ where: { guildId, status: 'new' } }),
  ]);
  return { total, hot, warm, new: newCount };
}

module.exports = { processInteraction, setLeadStatus, addLeadNote, findLead, getLeads, searchLeads, getLeadStats };
