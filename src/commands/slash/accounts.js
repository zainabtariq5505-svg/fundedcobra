const { SlashCommandBuilder } = require('discord.js');
const { handleSlashCatalog } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder().setName('accounts').setDescription('Show the current accounts text'),
  async execute(interaction) {
    return handleSlashCatalog(interaction);
  },
};
