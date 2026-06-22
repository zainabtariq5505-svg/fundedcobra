const { handlePrefixCatalog } = require('../shared/premium');

module.exports = {
  name: 'offer',
  aliases: ['coupon', 'pricing', 'accounts', 'payouts'],
  description: 'Show a premium offer, coupon, pricing, accounts, or payouts message',
  usage: '!offer | !coupon | !pricing | !accounts | !payouts',

  async execute(message, args, client, cmdName) {
    return handlePrefixCatalog(message, cmdName || 'offer');
  },
};
