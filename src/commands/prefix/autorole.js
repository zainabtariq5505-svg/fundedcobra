const { checkAdminMessage } = require('../../utils/adminCheck');
const { handleAutoRolePrefix } = require('../shared/autorole');

module.exports = {
  name: 'autorole',
  aliases: [
    'autorole-enable',
    'autorole-disable',
    'set-autorole',
    'remove-autorole',
    'autorole-status',
    'autorole-preview',
    'autorole-logs',
    'set-autorole-delay',
    'set-autorole-log',
    'autorole-ignore-bots-enable',
    'autorole-ignore-bots-disable',
  ],
  description: 'Manage the Auto Role System — automatically assigns a role to new members',
  usage: '!set-autorole @role | !autorole-enable | !autorole-status | !autorole-preview',
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    return handleAutoRolePrefix(message, args, cmdName || 'autorole-status');
  },
};
