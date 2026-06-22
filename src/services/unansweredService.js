const prisma = require('../database/prisma');
const { importFromText } = require('./ruleImportService');

async function saveUnansweredQuestion({ guildId, userId, username, question, intent = null, confidence = null, language = null, sourceName = null, sourceUrl = null }) {
  return prisma.unansweredQuestion.create({
    data: {
      guildId,
      userId,
      username,
      question,
      intent,
      confidence,
      language,
      sourceName,
      sourceUrl,
    },
  });
}

async function listUnansweredQuestions(guildId, limit = 25) {
  return prisma.unansweredQuestion.findMany({
    where: { guildId, status: 'open' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function answerUnansweredQuestion({ id, officialAnswer, adminId }) {
  const item = await prisma.unansweredQuestion.findUnique({ where: { id } });
  if (!item) return null;

  const source = await importFromText(
    `Q: ${item.question}\nA: ${officialAnswer}`,
    `Approved FAQ: ${item.question.slice(0, 40)}`,
    adminId,
    'faq',
  );

  return prisma.unansweredQuestion.update({
    where: { id },
    data: {
      status: 'answered',
      officialAnswer,
      approvedBy: adminId,
      approvedAt: new Date(),
      sourceId: source.source?.id || source.id || null,
    },
  });
}

async function deleteUnansweredQuestion(id) {
  return prisma.unansweredQuestion.delete({ where: { id } });
}

module.exports = {
  saveUnansweredQuestion,
  listUnansweredQuestions,
  answerUnansweredQuestion,
  deleteUnansweredQuestion,
};
