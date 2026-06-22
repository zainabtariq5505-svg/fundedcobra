const { checkAdminMessage } = require('../../utils/adminCheck');
const { handlePrefixSettings } = require('../shared/premium');

module.exports = {
  name: 'set-offer',
  aliases: ['set-coupon', 'set-pricing', 'set-rules-channel', 'set-support-channel', 'set-pricing-channel', 'set-lead-channel', 'set-ticket-category', 'set-admin-role', 'set-support-role', 'enable-dm-followup', 'disable-dm-followup'],
  description: 'Update premium bot settings',
  usage: '!set-offer <text> | !set-coupon <text> | !set-pricing <text> | !set-rules-channel <#channel> | !set-support-channel <#channel> | !set-pricing-channel <#channel> | !set-lead-channel <id> | !set-ticket-category <id> | !set-admin-role <id> | !set-support-role <id> | !enable-dm-followup | !disable-dm-followup',
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    return handlePrefixSettings(message, args, cmdName || 'set-offer');
  },
};
