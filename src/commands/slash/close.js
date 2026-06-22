const { SlashCommandBuilder } = require('discord.js');
const { closeTicket, findTicketByChannelId } = require('../../services/ticketService');
const { isModerator } = require('../../services/moderationService');
const { isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket and generate a transcript.')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for closing this ticket.')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
    const admin = isAdmin(interaction.member, settings?.adminRoleId);
    const mod = admin || await isModerator(interaction.member, interaction.guild.id).catch(() => false);
    const canManage = interaction.member.permissions.has('ManageChannels');

    if (!mod && !canManage) {
      return interaction.reply({ content: 'You need Manage Channels or moderator permissions to close tickets.', ephemeral: true });
    }

    const ticket = await findTicketByChannelId(interaction.channel.id);
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    }

    const reason = interaction.options.getString('reason');
    await interaction.reply({ content: `🔒 Closing ticket${reason ? ` — ${reason}` : ''}...`, ephemeral: true });

    await closeTicket(interaction.channel, interaction.user.id, client);
  },
};
