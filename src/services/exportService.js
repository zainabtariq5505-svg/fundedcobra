const { stringify } = require('csv-stringify/sync');
const prisma = require('../database/prisma');
const { formatDate } = require('../utils/formatDate');

/**
 * Exports all leads for a guild as a CSV buffer.
 * @param {string} guildId
 * @returns {Promise<Buffer>}
 */
async function exportLeadsCsv(guildId) {
  const leads = await prisma.lead.findMany({
    where: { guildId },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    include: { notes: { orderBy: { createdAt: 'asc' } } },
  });

  const rows = leads.map(lead => ({
    username:        lead.username,
    userId:          lead.userId,
    displayName:     lead.displayName || '',
    status:          lead.status,
    score:           lead.score,
    isLead:          lead.isLead ? 'Yes' : 'No',
    intent:          lead.intentSummary || '',
    firstQuestion:   (lead.firstQuestion || '').slice(0, 300),
    lastQuestion:    (lead.lastQuestion  || '').slice(0, 300),
    lastAnswer:      (lead.lastAnswer    || '').slice(0, 300),
    firstSeen:       formatDate(lead.createdAt),
    lastInteraction: formatDate(lead.updatedAt),
    notes:           lead.notes.map(n => n.note).join(' | '),
  }));

  const csv = stringify(rows, {
    header: true,
    columns: {
      username:        'Username',
      userId:          'User ID',
      displayName:     'Display Name',
      status:          'Status',
      score:           'Score',
      isLead:          'Is Lead',
      intent:          'Intent',
      firstQuestion:   'First Question',
      lastQuestion:    'Last Question',
      lastAnswer:      'Last Answer',
      firstSeen:       'First Seen',
      lastInteraction: 'Last Interaction',
      notes:           'Admin Notes',
    },
  });

  return Buffer.from(csv, 'utf-8');
}

/**
 * Exports recent question logs for a guild.
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Buffer>}
 */
async function exportQuestionsCsv(guildId, limit = 500) {
  const logs = await prisma.questionLog.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const rows = logs.map(q => ({
    date:       formatDate(q.createdAt),
    username:   q.username,
    userId:     q.userId,
    intent:     q.intent || '',
    confidence: q.confidence?.toFixed(2) || '',
    question:   q.question.slice(0, 500),
    answer:     q.answer.slice(0, 500),
  }));

  const csv = stringify(rows, {
    header: true,
    columns: {
      date: 'Date', username: 'Username', userId: 'User ID',
      intent: 'Intent', confidence: 'Confidence',
      question: 'Question', answer: 'Answer',
    },
  });

  return Buffer.from(csv, 'utf-8');
}

module.exports = { exportLeadsCsv, exportQuestionsCsv };
