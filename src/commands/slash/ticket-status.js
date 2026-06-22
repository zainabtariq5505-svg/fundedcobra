const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId } = require('../../services/ticketService');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-status')
    .setDescription('Show status of the current ticket.'),

  async execute(interaction) {
    const ticket = await findTicketByChannelId(interaction.channelId);
    if (!ticket) return interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });

    const messageCount = await prisma.ticketMessage.count({ where: { ticketId: ticket.id } });

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Ticket Status')
      .addFields(
        { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
        { name: 'User', value: `<@${ticket.openerId}>`, inline: true },
        { name: 'Category', value: ticket.category, inline: true },
        { name: 'Status', value: ticket.status, inline: true },
        { name: 'AI Status', value: ticket.aiEnabled ? 'Active' : 'Disabled', inline: true },
        { name: 'Claimed by', value: ticket.claimedById ? `<@${ticket.claimedById}>` : 'Unclaimed', inline: true },
        { name: 'Created at', value: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown', inline: true },
        { name: 'Last activity', value: ticket.lastActivityAt ? new Date(ticket.lastActivityAt).toLocaleString() : 'Unknown', inline: true },
        { name: 'Message count', value: String(messageCount), inline: true }
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();
      
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
