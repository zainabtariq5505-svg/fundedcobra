const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId, toggleAI, getTicketSettings } = require('../../services/ticketService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-ai-off')
    .setDescription('Disable AI assistant for this ticket.'),

  async execute(interaction) {
    const ticket = await findTicketByChannelId(interaction.channelId);
    if (!ticket) return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    
    const tSettings = await getTicketSettings(interaction.guildId);
    const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
    
    if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
        return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    }

    await toggleAI(interaction.channel, false);
    
    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle('AI Assistant Disabled')
      .setDescription('AI will no longer respond automatically in this ticket.')
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });
      
    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: 'AI disabled successfully.', ephemeral: true });
  },
};
