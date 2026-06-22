const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../config/permissions');
const { getUserTranscripts } = require('../../services/transcriptService');
const prisma = require('../../database/prisma');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcripts')
    .setDescription('Show the last 5 ticket transcripts for a user. (Admin only)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to look up transcripts for.')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const records = await getUserTranscripts(interaction.guild.id, user.id, 5);

    if (!records.length) {
      return interaction.reply({ content: `No transcripts found for ${user.username}.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`📋 Transcripts for ${user.username}`)
      .setDescription(
        records.map((r, i) => {
          const date = r.closedAt ? new Date(r.closedAt).toLocaleDateString() : 'Unknown';
          const duration = (r.openedAt && r.closedAt)
            ? Math.round((new Date(r.closedAt) - new Date(r.openedAt)) / 60000)
            : null;
          return `**${i + 1}.** Ticket \`${r.ticketId.slice(-8)}\` — ${r.messageCount} msgs — ${date}${duration !== null ? ` — ${duration} min` : ''}`;
        }).join('\n')
      )
      .setFooter(FOOTER)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
