const { SlashCommandBuilder } = require('discord.js');
const { handleSlashTicket } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closeticket')
    .setDescription('Close the current support ticket'),

  async execute(interaction) {
    return handleSlashTicket(interaction, 'closeticket');
  },
};
