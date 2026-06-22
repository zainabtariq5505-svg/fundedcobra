const { SlashCommandBuilder } = require('discord.js');
const { handleSlashTicket } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('List open support tickets (admin)')
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Ticket status filter')
        .addChoices(
          { name: 'Open', value: 'open' },
          { name: 'Closed', value: 'closed' },
        )
    ),

  async execute(interaction) {
    return handleSlashTicket(interaction, 'tickets');
  },
};
