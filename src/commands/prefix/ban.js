const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, parseDuration, formatDuration, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  name: 'ban',
  aliases: ['unban', 'softban'],
  description: 'Ban, unban, or softban a user',
  usage: '!ban <@user> [duration] [reason] | !unban <userId> [reason] | !softban <@user> [reason]',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    // ── !unban <userId> ──────────────────────────────────────────────────────────
    if (cmd === 'unban') {
      const userId = args[0];
      if (!userId) return message.reply({ embeds: [embeds.error('Usage: `!unban <userId> [reason]`')] });

      const reason = args.slice(1).join(' ') || 'No reason provided';

      try {
        const bannedUser = await message.guild.bans.fetch(userId).catch(() => null);
        if (!bannedUser) return message.reply({ embeds: [embeds.error('This user is not banned.')] });

        await message.guild.members.unban(userId, reason);
        const mc = await createCase({ guildId: message.guild.id, actionType: 'unban', target: { id: userId, tag: bannedUser.user?.tag ?? userId, username: bannedUser.user?.username ?? userId }, moderator: message.author, reason });
        await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unban', target: { id: userId, tag: bannedUser.user?.tag ?? userId }, moderator: message.author, reason }));
        return message.reply({ embeds: [embeds.success(`✅ **${bannedUser.user?.username ?? userId}** has been unbanned.\n**Reason:** ${reason}`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(`Failed to unban: ${err.message}`)] });
      }
    }

    // ── !softban ──────────────────────────────────────────────────────────────────
    if (cmd === 'softban') {
      const target = message.mentions.members.first();
      if (!target) return message.reply({ embeds: [embeds.error('Usage: `!softban <@user> [reason]`')] });

      const check = checkHierarchy(message.guild, message.member, target);
      if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });
      if (!target.bannable) return message.reply({ embeds: [embeds.error('I cannot ban this user.')] });

      const reason = args.slice(1).join(' ') || 'No reason provided';

      await dmUser(target.user, embeds.error(`You have been softbanned from **${message.guild.name}** (your recent messages have been removed).\n\n**Reason:** ${reason}`, 'Softbanned'));
      await target.ban({ reason, deleteMessageSeconds: 7 * 24 * 60 * 60 });
      await message.guild.members.unban(target.id, 'Softban — immediate unban').catch(() => {});

      const mc = await createCase({ guildId: message.guild.id, actionType: 'softban', target: target.user, moderator: message.author, reason });
      await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'softban', target: target.user, moderator: message.author, reason }));
      return message.reply({ embeds: [embeds.success(`🔨 **${target.user.username}** has been softbanned (banned + immediately unbanned to clear messages).\n**Reason:** ${reason}`)] });
    }

    // ── !ban ──────────────────────────────────────────────────────────────────────
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!ban <@user> [duration] [reason]`\n\nDuration (optional): `1h`, `1d`, `7d`\nOmit duration for permanent ban.')] });

    const check = checkHierarchy(message.guild, message.member, target);
    if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });
    if (!target.bannable) return message.reply({ embeds: [embeds.error('I cannot ban this user.')] });

    // Check if second arg is a duration or start of reason
    let duration = null, expiresAt = null, reasonStart = 1;
    const durationMs = parseDuration(args[1]);
    if (durationMs) {
      duration   = formatDuration(durationMs);
      expiresAt  = new Date(Date.now() + durationMs);
      reasonStart = 2;
    }

    const reason = args.slice(reasonStart).join(' ') || 'No reason provided';

    await dmUser(target.user, embeds.error(
      `You have been ${duration ? `temporarily banned (${duration})` : 'permanently banned'} from **${message.guild.name}**.\n\n**Reason:** ${reason}${expiresAt ? `\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : ''}`,
      'Banned',
    ));
    await target.ban({ reason, deleteMessageSeconds: 24 * 60 * 60 });

    const mc = await createCase({ guildId: message.guild.id, actionType: 'ban', target: target.user, moderator: message.author, reason, duration, expiresAt });
    await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'ban', target: target.user, moderator: message.author, reason, duration, expiresAt }));

    const banType = duration ? `temporarily banned for **${duration}**` : '**permanently banned**';
    return message.reply({ embeds: [embeds.success(`🔨 **${target.user.username}** has been ${banType}.\n**Reason:** ${reason}`)] });
  },
};
