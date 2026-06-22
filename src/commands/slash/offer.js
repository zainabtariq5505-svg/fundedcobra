const { SlashCommandBuilder } = require('discord.js');
const { handleSlashCatalog } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder().setName('offer').setDescription('Show the current offer text'),
  async execute(interaction) {
    return handleSlashCatalog(interaction);
  },
};
