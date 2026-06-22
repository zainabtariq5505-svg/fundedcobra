const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, parseDuration, formatDuration, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  name: 'mute',
  aliases: ['timeout', 'unmute'],
  description: 'Timeout (mute) or remove timeout from a user',
  usage: '!mute <@user> <duration> [reason] | !unmute <@user> [reason]',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    // ── !unmute ──────────────────────────────────────────────────────────────────
    if (cmd === 'unmute') {
      const target = message.mentions.members.first();
      if (!target) return message.reply({ embeds: [embeds.error('Usage: `!unmute <@user> [reason]`')] });

      const check = checkHierarchy(message.guild, message.member, target);
      if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });

      if (!target.communicationDisabledUntil) {
        return message.reply({ embeds: [embeds.error(`**${target.user.username}** is not currently timed out.`)] });
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.timeout(null, reason);

      const mc = await createCase({ guildId: message.guild.id, actionType: 'unmute', target: target.user, moderator: message.author, reason });
      await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unmute', target: target.user, moderator: message.author, reason }));
      await dmUser(target.user, embeds.success(`Your timeout in **${message.guild.name}** has been removed.\n\n**Reason:** ${reason}`, 'Unmuted'));

      return message.reply({ embeds: [embeds.success(`🔊 **${target.user.username}**'s timeout has been removed.`)] });
    }

    // ── !mute / !timeout ─────────────────────────────────────────────────────────
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!mute <@user> <duration> [reason]`\n\nDuration examples: `10m`, `1h`, `1d`, `7d`')] });

    const check = checkHierarchy(message.guild, message.member, target);
    if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });

    const durationStr = args[1];
    const durationMs  = parseDuration(durationStr);
    if (!durationMs) {
      return message.reply({ embeds: [embeds.error('Invalid duration. Use formats like `10m`, `1h`, `2d`, `7d`.')] });
    }

    // Discord timeout max is 28 days
    const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > MAX_TIMEOUT_MS) {
      return message.reply({ embeds: [embeds.error('Maximum timeout duration is **28 days**.')] });
    }

    const reason     = args.slice(2).join(' ') || 'No reason provided';
    const expiresAt  = new Date(Date.now() + durationMs);
    const durationLabel = formatDuration(durationMs);

    await target.timeout(durationMs, reason);

    const mc = await createCase({ guildId: message.guild.id, actionType: 'timeout', target: target.user, moderator: message.author, reason, duration: durationLabel, expiresAt });
    await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'timeout', target: target.user, moderator: message.author, reason, duration: durationLabel, expiresAt }));
    await dmUser(target.user, embeds.error(`You have been timed out in **${message.guild.name}** for **${durationLabel}**.\n\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, 'Timed Out'));

    return message.reply({ embeds: [embeds.success(`🔇 **${target.user.username}** has been timed out for **${durationLabel}**.\n**Reason:** ${reason}`)] });
  },
};
