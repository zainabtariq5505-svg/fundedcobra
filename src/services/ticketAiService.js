const { processQuestion } = require('./ragAnswerService');

async function processTicketQuestion({ question, guildId, channelId, userId, username, displayName, client }) {
  const result = await processQuestion({
    question,
    guildId,
    channelId,
    userId,
    username,
    displayName,
    client,
    isTicket: true,
  });

  return { answer: result.answer };
}

module.exports = { processTicketQuestion };
