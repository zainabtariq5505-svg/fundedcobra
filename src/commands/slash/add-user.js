const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId, getTicketSettings } = require('../../services/ticketService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription('Add a user to the current ticket.')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to add')
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
    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
    
    return interaction.reply({ content: `✅ Added <@${targetUser.id}> to the ticket.` });
  },
};
