const prisma = require('../database/prisma');

async function saveFeedback({ guildId, messageId, channelId, userId, username, helpful, note = null, question = null, answerPreview = null }) {
  return prisma.feedback.create({
    data: {
      guildId,
      messageId,
      channelId,
      userId,
      username,
      helpful,
      note,
      question,
      answerPreview,
    },
  });
}

module.exports = { saveFeedback };
