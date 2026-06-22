const { SlashCommandBuilder } = require('discord.js');
const { handleSlashCatalog } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder().setName('coupon').setDescription('Show the current coupon text'),
  async execute(interaction) {
    return handleSlashCatalog(interaction);
  },
};
