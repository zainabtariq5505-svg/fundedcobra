const { SlashCommandBuilder } = require('discord.js');
const { handleSlashCatalog } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder().setName('pricing').setDescription('Show the current pricing text'),
  async execute(interaction) {
    return handleSlashCatalog(interaction);
  },
};
