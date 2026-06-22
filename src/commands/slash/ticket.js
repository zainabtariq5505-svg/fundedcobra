const { SlashCommandBuilder } = require('discord.js');
const { handleSlashTicket } = require('../shared/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Ticket category')
        .addChoices(
          { name: 'Payout Issue', value: 'Payout Issue' },
          { name: 'Payment Issue', value: 'Payment Issue' },
          { name: 'Rules Question', value: 'Rules Question' },
          { name: 'Account Issue', value: 'Account Issue' },
          { name: 'Refund Request', value: 'Refund Request' },
          { name: 'General Support', value: 'General Support' },
        )
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Short reason for the ticket')
        .setRequired(false)
    ),

  async execute(interaction) {
    return handleSlashTicket(interaction, 'ticket');
  },
};
