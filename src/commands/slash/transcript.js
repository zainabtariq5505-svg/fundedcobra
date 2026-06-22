const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findTicketByChannelId } = require('../../services/ticketService');
const { generateManualTranscript, getTranscriptSettings } = require('../../services/transcriptService');
const { isModerator } = require('../../services/moderationService');
const { isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Generate a transcript for the current ticket channel.'),

  async execute(interaction, client) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
    const admin = isAdmin(interaction.member, settings?.adminRoleId);
    const mod = admin || await isModerator(interaction.member, interaction.guild.id).catch(() => false);
    const canManage = interaction.member.permissions.has('ManageChannels');

    if (!mod && !canManage) {
      return interaction.reply({ content: 'Staff only.', ephemeral: true });
    }

    const ticket = await findTicketByChannelId(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not a ticket channel.', ephemeral: true });
    }

    await interaction.reply({ content: '📋 Generating transcript...', ephemeral: true });

    const record = await generateManualTranscript(interaction.channel, ticket, interaction.user.id, client);

    if (!record) {
      return interaction.editReply({ content: '❌ Failed to generate transcript.' });
    }

    const transcriptSettings = await getTranscriptSettings(interaction.guild.id);
    if (transcriptSettings.transcriptChannelId) {
      return interaction.editReply({ content: `✅ Transcript generated and sent to <#${transcriptSettings.transcriptChannelId}>.` });
    }
    return interaction.editReply({ content: `✅ Transcript generated (${record.messageCount} messages). No transcript channel configured — use \`/set-transcript-channel\` to set one.` });
  },
};
