const { EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  name: 'modlogs',
  aliases: ['case', 'deletecase'],
  description: 'View moderation logs, look up a case, or void a case',
  usage: '!modlogs <@user> | !case <caseId> | !deletecase <caseId> [reason]',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();
    const ACTION_ICONS = {
      warn: '⚠️', mute: '🔇', timeout: '⏱️', unmute: '🔊', kick: '👢',
      ban: '🔨', unban: '✅', softban: '🔨', purge: '🗑️', lock: '🔒',
      unlock: '🔓', slowmode: '🐌', watch: '👁️', unwatch: '✅',
      blacklist: '🚫', unblacklist: '✅',
    };

    // ── !deletecase <id> ──────────────────────────────────────────────────────────
    if (cmd === 'deletecase') {
      const caseId = parseInt(args[0]);
      if (isNaN(caseId)) return message.reply({ embeds: [embeds.error('Usage: `!deletecase <caseId> [reason]`')] });
      const reason = args.slice(1).join(' ') || 'Voided by moderator';

      const mc = await prisma.moderationCase.findFirst({ where: { guildId: message.guild.id, caseId } });
      if (!mc) return message.reply({ embeds: [embeds.error(`Case #${caseId} not found.`)] });
      if (mc.status === 'deleted') return message.reply({ embeds: [embeds.error(`Case #${caseId} is already voided.`)] });

      await prisma.moderationCase.update({ where: { id: mc.id }, data: { status: 'deleted', deletedReason: reason } });
      return message.reply({ embeds: [embeds.success(`🗑️ Case #${caseId} has been voided.\n**Reason:** ${reason}`)] });
    }

    // ── !case <id> ────────────────────────────────────────────────────────────────
    if (cmd === 'case') {
      const caseId = parseInt(args[0]);
      if (isNaN(caseId)) return message.reply({ embeds: [embeds.error('Usage: `!case <caseId>`')] });

      const mc = await prisma.moderationCase.findFirst({ where: { guildId: message.guild.id, caseId } });
      if (!mc) return message.reply({ embeds: [embeds.error(`Case #${caseId} not found.`)] });

      const embed = new EmbedBuilder()
        .setColor(mc.status === 'deleted' ? 0x888888 : 0x1A1A2E)
        .setTitle(`${ACTION_ICONS[mc.actionType] ?? '⚖️'} Case #${mc.caseId} — ${mc.actionType.toUpperCase()}${mc.status === 'deleted' ? ' [VOIDED]' : ''}`)
        .addFields(
          { name: 'Target',    value: `<@${mc.targetUserId}> \`${mc.targetUsername}\``, inline: true },
          { name: 'Moderator', value: `<@${mc.moderatorId}> \`${mc.moderatorUsername}\``, inline: true },
          { name: 'Reason',    value: mc.reason || 'No reason provided', inline: false },
          { name: 'Date',      value: `<t:${Math.floor(new Date(mc.createdAt).getTime() / 1000)}:F>`, inline: true },
          { name: 'Status',    value: mc.status.charAt(0).toUpperCase() + mc.status.slice(1), inline: true },
        )
        .setFooter(FOOTER)
        .setTimestamp();

      if (mc.duration) embed.addFields({ name: 'Duration', value: mc.duration, inline: true });
      if (mc.expiresAt) embed.addFields({ name: 'Expires', value: `<t:${Math.floor(new Date(mc.expiresAt).getTime() / 1000)}:R>`, inline: true });
      if (mc.deletedReason) embed.addFields({ name: 'Void Reason', value: mc.deletedReason, inline: false });

      return message.reply({ embeds: [embed] });
    }

    // ── !modlogs <@user> ──────────────────────────────────────────────────────────
    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!modlogs <@user>`')] });

    const cases = await prisma.moderationCase.findMany({
      where: { guildId: message.guild.id, targetUserId: target.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    if (!cases.length) {
      return message.reply({ embeds: [embeds.success(`**${target.username}** has no moderation history.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x1A1A2E)
      .setTitle(`📋 Moderation Logs — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`Showing last ${cases.length} cases.`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const mc of cases) {
      const icon   = ACTION_ICONS[mc.actionType] ?? '⚖️';
      const status = mc.status === 'deleted' ? ' ~~voided~~' : '';
      embed.addFields({
        name:  `${icon} Case #${mc.caseId} — ${mc.actionType.toUpperCase()}${status}`,
        value: `**Reason:** ${mc.reason || 'N/A'}\n**By:** <@${mc.moderatorId}> · <t:${Math.floor(new Date(mc.createdAt).getTime() / 1000)}:D>${mc.duration ? `\n**Duration:** ${mc.duration}` : ''}`,
        inline: false,
      });
    }

    return message.reply({ embeds: [embed] });
  },
};
