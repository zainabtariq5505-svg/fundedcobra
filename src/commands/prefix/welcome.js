const { checkAdminMessage } = require('../../utils/adminCheck');
const { handleWelcomePrefix } = require('../shared/welcome');

module.exports = {
  name: 'welcome',
  aliases: [
    'welcome-enable',
    'welcome-disable',
    'welcome-preview',
    'set-welcome-channel',
    'set-welcome-message',
    'set-welcome-banner',
    'set-welcome-thumbnail',
    'set-welcome-role',
    'remove-welcome-role',
    'welcome-dm-enable',
    'welcome-dm-disable',
    'set-welcome-dm',
    'set-welcome-button',
    'remove-welcome-button',
  ],
  description: 'Manage the premium welcome system',
  usage: '!welcome | !welcome-enable | !welcome-preview | !set-welcome-channel #channel',
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    return handleWelcomePrefix(message, args, cmdName || 'welcome');
  },
};