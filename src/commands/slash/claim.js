const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId, claimTicket, getTicketSettings } = require('../../services/ticketService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim a ticket and disable the AI assistant.'),

  async execute(interaction) {
    const ticket = await findTicketByChannelId(interaction.channelId);
    if (!ticket) return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    if (ticket.status === 'claimed') return interaction.reply({ content: 'Ticket is already claimed.', ephemeral: true });
    
    const tSettings = await getTicketSettings(interaction.guildId);
    const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
    
    if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
        return interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true });
    }

    await claimTicket(interaction.channel, interaction.user.id, interaction.user.username);
    
    const claimEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('Ticket Claimed')
      .setDescription(`**${interaction.user.username}** has claimed this ticket. AI assistance is now paused, and a real FundedCobra support member will continue from here.`)
      .addFields(
        { name: 'Claimed by', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'AI Status', value: 'Disabled', inline: true },
        { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
        { name: 'Claimed at', value: new Date().toLocaleString(), inline: true }
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();
      
    await interaction.channel.send({ embeds: [claimEmbed] });
    return interaction.reply({ content: 'Ticket claimed successfully.', ephemeral: true });
  },
};
