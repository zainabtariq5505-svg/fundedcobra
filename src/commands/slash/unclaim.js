const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId, unclaimTicket, getTicketSettings } = require('../../services/ticketService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unclaim')
    .setDescription('Unclaim a ticket and optionally re-enable AI.'),

  async execute(interaction) {
    const ticket = await findTicketByChannelId(interaction.channelId);
    if (!ticket) return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    if (ticket.status !== 'claimed') return interaction.reply({ content: 'Ticket is not claimed.', ephemeral: true });
    
    const tSettings = await getTicketSettings(interaction.guildId);
    const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
    
    if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
        return interaction.reply({ content: 'You do not have permission to unclaim tickets.', ephemeral: true });
    }

    const updated = await unclaimTicket(interaction.channel, interaction.user.id, interaction.user.username);
    
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Ticket Unclaimed')
      .setDescription(`**${interaction.user.username}** has unclaimed this ticket.`)
      .addFields(
        { name: 'AI Status', value: updated.aiEnabled ? 'Enabled' : 'Disabled', inline: true }
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();
      
    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: 'Ticket unclaimed successfully.', ephemeral: true });
  },
};
