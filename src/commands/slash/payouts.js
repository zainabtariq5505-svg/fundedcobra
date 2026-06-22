const { SlashCommandBuilder } = require('discord.js');
const { handleSlashCatalog } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder().setName('payouts').setDescription('Show the current payouts text'),
  async execute(interaction) {
    return handleSlashCatalog(interaction);
  },
};
