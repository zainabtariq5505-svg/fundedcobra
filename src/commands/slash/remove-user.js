const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId, getTicketSettings } = require('../../services/ticketService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-user')
    .setDescription('Remove a user from the current ticket.')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove')
        .setRequired(true)),

  async execute(interaction) {
    const ticket = await findTicketByChannelId(interaction.channelId);
    if (!ticket) return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    
    const tSettings = await getTicketSettings(interaction.guildId);
    const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
    
    if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
        return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    
    // Don't let them remove the opener
    if (targetUser.id === ticket.openerId) {
        return interaction.reply({ content: 'You cannot remove the ticket owner.', ephemeral: true });
    }
    
    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false
    });
    
    return interaction.reply({ content: `✅ Removed <@${targetUser.id}> from the ticket.` });
  },
};
