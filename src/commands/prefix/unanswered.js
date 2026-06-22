const { checkAdminMessage } = require('../../utils/adminCheck');
const { handlePrefixUnanswered } = require('../shared/premium');

module.exports = {
  name: 'unanswered',
  aliases: ['answer-unanswered', 'delete-unanswered'],
  description: 'Review or publish unanswered questions',
  usage: '!unanswered | !answer-unanswered <id> <official answer> | !delete-unanswered <id>',
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    return handlePrefixUnanswered(message, args, cmdName || 'unanswered');
  },
};
