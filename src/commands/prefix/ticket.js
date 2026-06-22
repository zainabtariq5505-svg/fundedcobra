const { handlePrefixTicket } = require('../shared/premium');

module.exports = {
  name: 'ticket',
  aliases: ['closeticket', 'tickets'],
  description: 'Create, close, or list support tickets',
  usage: '!ticket [category] [reason] | !closeticket | !tickets',

  async execute(message, args, client, cmdName) {
    return handlePrefixTicket(message, args, cmdName || 'ticket');
  },
};
