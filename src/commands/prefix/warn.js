const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser, handleAutoWarn } = require('../../services/moderationService');

module.exports = {
  name: 'warn',
  aliases: ['warnings', 'clearwarns'],
  description: 'Warn a user, view their warnings, or clear warnings',
  usage: '!warn <@user> <reason> | !warnings <@user> | !clearwarns <@user>',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    // ── !warnings <@user> ───────────────────────────────────────────────────────
    if (cmd === 'warnings') {
      const target = message.mentions.members.first();
      if (!target) return message.reply({ embeds: [embeds.error('Usage: `!warnings <@user>`')] });

      const warns = await prisma.warning.findMany({
        where: { guildId: message.guild.id, targetUserId: target.id, active: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!warns.length) {
        return message.reply({ embeds: [embeds.success(`**${target.user.username}** has no active warnings.`)] });
      }

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`⚠️ Warnings — ${target.user.username} (${warns.length})`)
        .setThumbnail(target.user.displayAvatarURL())
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();

      for (const [i, w] of warns.slice(0, 10).entries()) {
        embed.addFields({
          name: `#${i + 1} — <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:D>`,
          value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>`,
          inline: false,
        });
      }
      if (warns.length > 10) embed.setDescription(`Showing 10 of ${warns.length} warnings.`);

      return message.reply({ embeds: [embed] });
    }

    // ── !clearwarns <@user> ─────────────────────────────────────────────────────
    if (cmd === 'clearwarns') {
      const target = message.mentions.members.first();
      if (!target) return message.reply({ embeds: [embeds.error('Usage: `!clearwarns <@user>`')] });

      const { count } = await prisma.warning.updateMany({
        where: { guildId: message.guild.id, targetUserId: target.id, active: true },
        data: { active: false },
      });

      return message.reply({ embeds: [embeds.success(`Cleared **${count}** warning(s) for **${target.user.username}**.`)] });
    }

    // ── !warn <@user> <reason> ──────────────────────────────────────────────────
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!warn <@user> <reason>`')] });

    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [embeds.error('Please provide a reason for the warning.')] });

    const check = checkHierarchy(message.guild, message.member, target);
    if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });

    await prisma.warning.create({
      data: {
        guildId:          message.guild.id,
        targetUserId:     target.id,
        targetUsername:   target.user.tag,
        moderatorId:      message.author.id,
        moderatorUsername: message.author.tag,
        reason,
        active: true,
      },
    });

    const mc = await createCase({
      guildId:   message.guild.id,
      actionType: 'warn',
      target:    target.user,
      moderator: message.author,
      reason,
    });

    const modEmbed = buildModEmbed({ caseId: mc.caseId, actionType: 'warn', target: target.user, moderator: message.author, reason });
    await sendModLog(client, message.guild.id, modEmbed);

    const activeWarns = await prisma.warning.count({
      where: { guildId: message.guild.id, targetUserId: target.id, active: true },
    });

    await dmUser(target.user, embeds.error(`You have received a warning in **${message.guild.name}**.\n\n**Reason:** ${reason}\n\n*You now have ${activeWarns} active warning(s).*`, 'Warning'));

    await message.reply({ embeds: [embeds.success(`⚠️ **${target.user.username}** has been warned. (${activeWarns} total warning(s))\n**Reason:** ${reason}`)] });

    await handleAutoWarn(message.guild, target, activeWarns, client);
  },
};
