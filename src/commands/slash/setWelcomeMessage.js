const { SlashCommandBuilder } = require('discord.js');
const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-message',
  description: 'Set the welcome message',
  mode: 'set-welcome-message',
  configure(builder) {
    return builder.addStringOption((opt) =>
      opt.setName('message')
        .setDescription('Welcome message template')
        .setRequired(true)
    );
  },
});