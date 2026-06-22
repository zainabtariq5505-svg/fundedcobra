const { ChannelType } = require('discord.js');
const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'set-autorole-log',
  description: 'Set the channel where auto role assignment logs are sent',
  mode: 'set-autorole-log',
  configure: (b) =>
    b.addChannelOption((o) =>
      o.setName('channel')
        .setDescription('The log channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
});
