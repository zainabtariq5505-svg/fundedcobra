const { EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const logger = require('../../utils/logger');
const { isAdmin } = require('../../config/permissions');
const {
  getUserInviteStats,
  getLeaderboard,
  resetUserInvites,
  getInviteSettings,
} = require('../../services/inviteService');

const BRAND_COLOR = 0x1a1a2e;
const ACCENT_COLOR = 0x0099ff;
const GOLD_COLOR = 0xffd700;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

function parseDurationToMinutes(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 'm': return val;
    case 'h': return val * 60;
    case 'd': return val * 1440;
    case 'w': return val * 10080;
    default: return null;
  }
}

function resolveUser(message, args) {
  const mention = args[0];
  if (!mention) return message.author;
  const idMatch = mention.match(/^<@!?(\d+)>$/) || mention.match(/^(\d+)$/);
  if (idMatch) {
    return message.guild.members.cache.get(idMatch[1])?.user || { id: idMatch[1], username: 'Unknown' };
  }
  return message.author;
}

async function handleStats(message, args) {
  const target = resolveUser(message, args);
  const stats = await getUserInviteStats(message.guild.id, target.id);

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('🔗 Invite Stats')
    .setDescription(`Stats for <@${target.id}>`)
    .addFields(
      { name: 'Total Invites', value: String(stats?.totalInvites ?? 0), inline: true },
      { name: 'Valid Invites', value: String(stats?.validInvites ?? 0), inline: true },
      { name: 'Left', value: String(stats?.leftInvites ?? 0), inline: true },
      { name: 'Suspicious', value: String(stats?.suspiciousInvites ?? 0), inline: true },
      { name: 'Bonus Entries', value: String(stats?.bonusEntriesEarned ?? 0), inline: true }
    )
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleLeaderboard(message) {
  const entries = await getLeaderboard(message.guild.id, 10);

  const description = entries.length
    ? entries.map((u, i) => `${i + 1}. <@${u.userId}> — **${u.validInvites}** valid (${u.totalInvites} total)`).join('\n')
    : 'No invite data yet.';

  const embed = new EmbedBuilder()
    .setColor(GOLD_COLOR)
    .setTitle('🏆 Invite Leaderboard')
    .setDescription(description)
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleResetInvites(message, args) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  const target = resolveUser(message, args);
  if (!args[0]) return message.reply('Please mention a user to reset.');

  await resetUserInvites(message.guild.id, target.id, target.username);

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Invite Stats Reset')
    .setDescription(`Invite stats for <@${target.id}> have been reset to zero.`)
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleSetInviteLog(message, args) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  const channelMention = args[0];
  const channelIdMatch = channelMention?.match(/^<#(\d+)>$/) || channelMention?.match(/^(\d+)$/);
  if (!channelIdMatch) return message.reply('Please mention a valid channel.');

  const channelId = channelIdMatch[1];

  await prisma.inviteSettings.upsert({
    where: { guildId: message.guild.id },
    update: { inviteLogChannelId: channelId },
    create: { guildId: message.guild.id, inviteLogChannelId: channelId },
  });

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Invite Log Channel Set')
    .setDescription(`Invite log channel set to <#${channelId}>.`)
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleSetMinStay(message, args) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  const minutes = parseDurationToMinutes(args[0]);
  if (minutes === null) return message.reply('Invalid duration. Use formats like `10m`, `1h`, `1d`, `1w`.');

  await prisma.inviteSettings.upsert({
    where: { guildId: message.guild.id },
    update: { minStayMinutes: minutes },
    create: { guildId: message.guild.id, minStayMinutes: minutes },
  });

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Min Stay Updated')
    .setDescription(`Minimum stay time set to **${minutes} minutes** (${args[0]}).`)
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleSetMinAccountAge(message, args) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  const minutes = parseDurationToMinutes(args[0]);
  if (minutes === null) return message.reply('Invalid duration. Use formats like `10m`, `1h`, `1d`, `1w`.');

  await prisma.inviteSettings.upsert({
    where: { guildId: message.guild.id },
    update: { minAccountAgeMinutes: minutes },
    create: { guildId: message.guild.id, minAccountAgeMinutes: minutes },
  });

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Min Account Age Updated')
    .setDescription(`Minimum account age set to **${minutes} minutes** (${args[0]}).`)
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleBonusEnable(message) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  await prisma.inviteSettings.upsert({
    where: { guildId: message.guild.id },
    update: { giveawayBonusEnabled: true },
    create: { guildId: message.guild.id, giveawayBonusEnabled: true },
  });

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Invite Bonus Enabled')
    .setDescription('Giveaway bonus invites have been **enabled**.')
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function handleBonusDisable(message) {
  const gs = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  if (!isAdmin(message.member, gs?.adminRoleId)) {
    return message.reply('Admin only.');
  }

  await prisma.inviteSettings.upsert({
    where: { guildId: message.guild.id },
    update: { giveawayBonusEnabled: false },
    create: { guildId: message.guild.id, giveawayBonusEnabled: false },
  });

  const embed = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('Invite Bonus Disabled')
    .setDescription('Giveaway bonus invites have been **disabled**.')
    .setFooter(FOOTER)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

module.exports = {
  name: 'invites',
  aliases: [
    'invite-leaderboard',
    'invite-stats',
    'reset-invites',
    'set-invite-log',
    'invite-bonus-enable',
    'invite-bonus-disable',
    'set-min-invite-stay',
    'set-min-account-age',
  ],
  description: 'Invite tracking commands',
  usage: '!invites [user] | !invite-leaderboard | !invite-stats [user] | !reset-invites @user | !set-invite-log #channel | !set-min-invite-stay <duration> | !set-min-account-age <duration> | !invite-bonus-enable | !invite-bonus-disable',
  async execute(message, args, client, cmdName) {
    try {
      switch (cmdName) {
        case 'invite-leaderboard':
          return handleLeaderboard(message);
        case 'invite-stats':
          return handleStats(message, args);
        case 'reset-invites':
          return handleResetInvites(message, args);
        case 'set-invite-log':
          return handleSetInviteLog(message, args);
        case 'set-min-invite-stay':
          return handleSetMinStay(message, args);
        case 'set-min-account-age':
          return handleSetMinAccountAge(message, args);
        case 'invite-bonus-enable':
          return handleBonusEnable(message);
        case 'invite-bonus-disable':
          return handleBonusDisable(message);
        default:
          return handleStats(message, args);
      }
    } catch (err) {
      logger.error(`[invites prefix] error in ${cmdName}: ${err.message}`);
      return message.reply('An error occurred. Please try again.');
    }
  },
};
