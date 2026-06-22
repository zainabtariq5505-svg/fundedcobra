const { checkAdminMessage } = require('../../utils/adminCheck');
const { handleBoosterPrefix } = require('../shared/booster');

module.exports = {
  name: 'booster',
  aliases: [
    'booster-enable',
    'booster-disable',
    'set-booster-channel',
    'set-booster-message',
    'set-booster-banner',
    'set-booster-thumbnail',
    'set-booster-role',
    'remove-booster-role',
    'booster-preview',
    'booster-stats',
    'booster-list',
    'booster-logs',
    'set-booster-reactions',
    'booster-dm-enable',
    'booster-dm-disable',
    'set-booster-dm',
  ],
  description: 'Manage the premium Server Booster Appreciation System',
  usage: '!booster-enable | !set-booster-channel #channel | !booster-stats | !booster-preview',
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    return handleBoosterPrefix(message, args, cmdName || 'booster');
  },
};
