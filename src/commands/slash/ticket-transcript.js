const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-transcript')
    .setDescription('Generate transcript for current ticket or look up an old one. (Admin only)')
    .addStringOption(opt =>
      opt.setName('ticket_id')
        .setDescription('Optional: The ticket ID or partial ID to search for.')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const ticketId = interaction.options.getString('ticket_id');

    if (!ticketId) {
      const { findTicketByChannelId } = require('../../services/ticketService');
      const { generateManualTranscript } = require('../../services/transcriptService');
      const ticket = await findTicketByChannelId(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'This channel is not a ticket. Please provide a ticket ID to search.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const record = await generateManualTranscript(interaction.channel, ticket, interaction.user.id, client);
      if (record && record.txtFilePath) {
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(record.txtFilePath);
        return interaction.editReply({ content: 'Transcript generated.', files: [attachment] });
      }
      return interaction.editReply({ content: 'Failed to generate transcript.' });
    }

    const record = await prisma.ticketTranscript.findFirst({
      where: {
        guildId: interaction.guild.id,
        ticketId: { contains: ticketId },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return interaction.reply({ content: `No transcript found for ticket ID containing \`${ticketId}\`.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 Ticket Transcript')
      .addFields(
        { name: 'Ticket ID', value: record.ticketId.slice(-8), inline: true },
        { name: 'User', value: `<@${record.userId}> (${record.username})`, inline: true },
        { name: 'Messages', value: String(record.messageCount), inline: true },
        { name: 'Closed By', value: record.closedBy ? `<@${record.closedBy}>` : 'Unknown', inline: true },
        { name: 'Opened', value: record.openedAt ? new Date(record.openedAt).toLocaleString() : 'N/A', inline: true },
        { name: 'Closed', value: record.closedAt ? new Date(record.closedAt).toLocaleString() : 'N/A', inline: true },
        { name: 'HTML File', value: record.htmlFilePath || 'None', inline: false },
        { name: 'TXT File', value: record.txtFilePath || 'None', inline: false },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (record.aiSummary) {
      embed.addFields({ name: '🤖 AI Summary', value: record.aiSummary.slice(0, 1024), inline: false });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
