const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

const ICONS = { warn:'⚠️', mute:'🔇', timeout:'⏱️', unmute:'🔊', kick:'👢', ban:'🔨', unban:'✅', softban:'🔨', purge:'🗑️', lock:'🔒', unlock:'🔓', slowmode:'🐌', watch:'👁️', unwatch:'✅', blacklist:'🚫', unblacklist:'✅' };
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View moderation history for a user')
    .addUserOption(o => o.setName('user').setDescription('The user to look up').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const cases = await prisma.moderationCase.findMany({ where: { guildId: interaction.guild.id, targetUserId: user.id }, orderBy: { createdAt: 'desc' }, take: 15 });

    if (!cases.length) return interaction.reply({ embeds: [embeds.success(`**${user.username}** has no moderation history.`)], ephemeral: true });

    const embed = new EmbedBuilder().setColor(0x1A1A2E).setTitle(`📋 Mod Logs — ${user.username}`).setThumbnail(user.displayAvatarURL()).setDescription(`Last ${cases.length} cases`).setFooter(FOOTER).setTimestamp();
    for (const mc of cases) {
      const icon = ICONS[mc.actionType] ?? '⚖️';
      const status = mc.status === 'deleted' ? ' ~~voided~~' : '';
      embed.addFields({ name: `${icon} #${mc.caseId} — ${mc.actionType.toUpperCase()}${status}`, value: `**Reason:** ${mc.reason || 'N/A'}\n**By:** <@${mc.moderatorId}> · <t:${Math.floor(new Date(mc.createdAt).getTime() / 1000)}:D>${mc.duration ? `\n**Duration:** ${mc.duration}` : ''}`, inline: false });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
