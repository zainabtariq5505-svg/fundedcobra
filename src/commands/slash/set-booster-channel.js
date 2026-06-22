const { ChannelType } = require('discord.js');
const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'set-booster-channel',
  description: 'Set the channel where booster appreciation messages are sent',
  mode: 'set-booster-channel',
  configure: (b) =>
    b.addChannelOption((o) =>
      o.setName('channel')
        .setDescription('The booster appreciation channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
});
