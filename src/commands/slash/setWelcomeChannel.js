const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-channel',
  description: 'Set the welcome channel',
  mode: 'set-welcome-channel',
  configure(builder) {
    return builder.addChannelOption((opt) =>
      opt.setName('channel')
        .setDescription('Welcome channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    );
  },
});