const { EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const {
  getLeaderboard,
  getXPSettings,
  calcLevel,
  handleLevelUp,
} = require('../../services/xpService');

const GOLD_COLOR   = 0xFFD700;
const ACCENT_COLOR = 0x0099FF;

async function getSettings(guildId) {
  return prisma.guildSettings.findUnique({ where: { guildId } }).catch(() => null);
}

module.exports = {
  name: 'xp-leaderboard',
  aliases: [
    'xp-add',
    'xp-remove',
    'xp-reset',
    'set-xp-channel',
    'set-xp-role',
    'remove-xp-role',
    'xp-enable',
    'xp-disable',
  ],
  description: 'XP management commands.',
  usage: '!xp-leaderboard | !xp-add @user amount | !xp-remove @user amount | !xp-reset @user | !set-xp-channel #channel | !set-xp-role level @role | !remove-xp-role level | !xp-enable | !xp-disable',
  cooldown: 3,

  async execute(message, args, client, cmdName) {
    const guildId = message.guild.id;
    const guildSettings = await getSettings(guildId);

    // ── Leaderboard ──────────────────────────────────────────────────────────
    if (cmdName === 'xp-leaderboard') {
      const top = await getLeaderboard(guildId, 10);

      if (!top.length) {
        const embed = new EmbedBuilder()
          .setColor(GOLD_COLOR)
          .setTitle('🏆 XP Leaderboard')
          .setDescription('No XP data yet. Start chatting!')
          .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const rows = top
        .map((u, i) =>
          `${i + 1}. <@${u.userId}> — Level **${u.level}** · ${u.totalXp.toLocaleString()} XP · ${u.messageCount} msgs`
        )
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(GOLD_COLOR)
        .setTitle('🏆 XP Leaderboard')
        .setDescription(rows)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── Admin-only commands below ─────────────────────────────────────────────
    if (!isAdmin(message.member, guildSettings?.adminRoleId)) {
      return message.reply({ content: 'Admin only.' });
    }

    // ── XP Add ───────────────────────────────────────────────────────────────
    if (cmdName === 'xp-add') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1], 10);
      if (!target || isNaN(amount) || amount <= 0) {
        return message.reply({ content: 'Usage: `!xp-add @user <amount>`' });
      }

      const existing = await prisma.userXP.findUnique({
        where: { guildId_userId: { guildId, userId: target.id } },
      });

      const oldLevel = existing?.level ?? 0;
      const newTotal = (existing?.totalXp ?? 0) + amount;
      const newLevel = calcLevel(newTotal);

      const record = await prisma.userXP.upsert({
        where: { guildId_userId: { guildId, userId: target.id } },
        update: { totalXp: { increment: amount }, level: newLevel },
        create: {
          guildId,
          userId: target.id,
          username: target.username,
          totalXp: amount,
          level: newLevel,
          messageCount: 0,
        },
      });

      await prisma.xPLog.create({
        data: { guildId, userId: target.id, xpAmount: amount, reason: 'admin-add' },
      });

      if (newLevel > oldLevel) {
        const member = message.guild.members.cache.get(target.id)
          || await message.guild.members.fetch(target.id).catch(() => null);
        if (member) {
          const xpSettings = await getXPSettings(guildId);
          await handleLevelUp(message.guild, member, newLevel, xpSettings, client);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(`✅ Added **${amount} XP** to <@${target.id}>. New total: **${record.totalXp.toLocaleString()} XP** (Level ${newLevel})`)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── XP Remove ────────────────────────────────────────────────────────────
    if (cmdName === 'xp-remove') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1], 10);
      if (!target || isNaN(amount) || amount <= 0) {
        return message.reply({ content: 'Usage: `!xp-remove @user <amount>`' });
      }

      const existing = await prisma.userXP.findUnique({
        where: { guildId_userId: { guildId, userId: target.id } },
      });

      if (!existing) {
        return message.reply({ content: `<@${target.id}> has no XP record.` });
      }

      const newTotal = Math.max(0, existing.totalXp - amount);
      const newLevel = calcLevel(newTotal);

      const record = await prisma.userXP.update({
        where: { guildId_userId: { guildId, userId: target.id } },
        data: { totalXp: newTotal, level: newLevel },
      });

      await prisma.xPLog.create({
        data: { guildId, userId: target.id, xpAmount: -amount, reason: 'admin-remove' },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(`✅ Removed **${amount} XP** from <@${target.id}>. New total: **${record.totalXp.toLocaleString()} XP** (Level ${newLevel})`)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── XP Reset ─────────────────────────────────────────────────────────────
    if (cmdName === 'xp-reset') {
      const target = message.mentions.users.first();
      if (!target) {
        return message.reply({ content: 'Usage: `!xp-reset @user`' });
      }

      await prisma.userXP.upsert({
        where: { guildId_userId: { guildId, userId: target.id } },
        update: { totalXp: 0, level: 0, messageCount: 0 },
        create: {
          guildId,
          userId: target.id,
          username: target.username,
          totalXp: 0,
          level: 0,
          messageCount: 0,
        },
      });

      await prisma.xPLog.create({
        data: { guildId, userId: target.id, xpAmount: 0, reason: 'admin-reset' },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(`✅ Reset XP for <@${target.id}> to 0.`)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── Set XP Channel ───────────────────────────────────────────────────────
    if (cmdName === 'set-xp-channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({ content: 'Usage: `!set-xp-channel #channel`' });
      }

      await prisma.xPSettings.upsert({
        where: { guildId },
        update: { xpChannelId: channel.id },
        create: { guildId, xpChannelId: channel.id },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(`✅ XP will now only be earned in <#${channel.id}>.`)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── Set XP Role ──────────────────────────────────────────────────────────
    if (cmdName === 'set-xp-role') {
      const level = parseInt(args[0], 10);
      const role = message.mentions.roles.first();
      if (isNaN(level) || level < 1 || !role) {
        return message.reply({ content: 'Usage: `!set-xp-role <level> @role`' });
      }

      await prisma.xPLevelRole.upsert({
        where: { guildId_level: { guildId, level } },
        update: { roleId: role.id },
        create: { guildId, level, roleId: role.id },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(`✅ <@&${role.id}> will be awarded at Level **${level}**.`)
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── Remove XP Role ───────────────────────────────────────────────────────
    if (cmdName === 'remove-xp-role') {
      const level = parseInt(args[0], 10);
      if (isNaN(level) || level < 1) {
        return message.reply({ content: 'Usage: `!remove-xp-role <level>`' });
      }

      const deleted = await prisma.xPLevelRole.deleteMany({
        where: { guildId, level },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription(
          deleted.count
            ? `✅ Removed level role assignment for Level **${level}**.`
            : `No role assignment found for Level **${level}**.`
        )
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── XP Enable ────────────────────────────────────────────────────────────
    if (cmdName === 'xp-enable') {
      await prisma.xPSettings.upsert({
        where: { guildId },
        update: { enabled: true },
        create: { guildId, enabled: true },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription('✅ XP system **enabled**.')
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }

    // ── XP Disable ───────────────────────────────────────────────────────────
    if (cmdName === 'xp-disable') {
      await prisma.xPSettings.upsert({
        where: { guildId },
        update: { enabled: false },
        create: { guildId, enabled: false },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setDescription('✅ XP system **disabled**.')
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

      return message.reply({ embeds: [embed] });
    }
  },
};
