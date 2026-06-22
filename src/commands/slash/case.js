const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

const ICONS = { warn:'⚠️', mute:'🔇', timeout:'⏱️', unmute:'🔊', kick:'👢', ban:'🔨', unban:'✅', softban:'🔨', purge:'🗑️', lock:'🔒', unlock:'🔓', slowmode:'🐌' };
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Look up a moderation case by ID')
    .addIntegerOption(o => o.setName('id').setDescription('The case number').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const caseId = interaction.options.getInteger('id');
    const mc = await prisma.moderationCase.findFirst({ where: { guildId: interaction.guild.id, caseId } });
    if (!mc) return interaction.reply({ embeds: [embeds.error(`Case #${caseId} not found.`)], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(mc.status === 'deleted' ? 0x888888 : 0x1A1A2E)
      .setTitle(`${ICONS[mc.actionType] ?? '⚖️'} Case #${mc.caseId} — ${mc.actionType.toUpperCase()}${mc.status === 'deleted' ? ' [VOIDED]' : ''}`)
      .addFields(
        { name: 'Target',    value: `<@${mc.targetUserId}> \`${mc.targetUsername}\``, inline: true },
        { name: 'Moderator', value: `<@${mc.moderatorId}> \`${mc.moderatorUsername}\``, inline: true },
        { name: 'Reason',    value: mc.reason || 'N/A', inline: false },
        { name: 'Date',      value: `<t:${Math.floor(new Date(mc.createdAt).getTime() / 1000)}:F>`, inline: true },
        { name: 'Status',    value: mc.status.charAt(0).toUpperCase() + mc.status.slice(1), inline: true },
      )
      .setFooter(FOOTER)
      .setTimestamp();
    if (mc.duration) embed.addFields({ name: 'Duration', value: mc.duration, inline: true });
    if (mc.expiresAt) embed.addFields({ name: 'Expires', value: `<t:${Math.floor(new Date(mc.expiresAt).getTime() / 1000)}:R>`, inline: true });
    if (mc.deletedReason) embed.addFields({ name: 'Void Reason', value: mc.deletedReason, inline: false });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
