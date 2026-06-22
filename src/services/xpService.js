const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const crypto = require('crypto');

const BRAND_COLOR  = 0x1A1A2E;
const ACCENT_COLOR = 0x0099FF;
const GOLD_COLOR   = 0xFFD700;

// Level formula: level = floor(0.1 * sqrt(totalXp))
function calcLevel(totalXp) {
  return Math.floor(0.1 * Math.sqrt(totalXp));
}

// XP needed to reach a level: (level/0.1)^2
function xpForLevel(level) {
  return Math.pow(level / 0.1, 2);
}

// In-memory cooldown: Map<"guildId:userId", timestamp>
const xpCooldowns = new Map();

async function getXPSettings(guildId) {
  return prisma.xPSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

async function awardXP(message, client) {
  try {
    const settings = await getXPSettings(message.guild.id);
    if (!settings.enabled) return;

    if (message.author.bot) return;

    if (settings.xpChannelId && message.channel.id !== settings.xpChannelId) return;

    // Fetch guild prefix to detect commands
    const guildSettings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    }).catch(() => null);
    const prefix = guildSettings?.prefix || process.env.BOT_PREFIX || '!';

    const content = message.content;

    if (settings.ignoreCommands && content.startsWith(prefix)) return;

    if (content.length < settings.minMessageLength) return;

    // Ignore links-only messages
    if (/^https?:\/\/\S+$/.test(content.trim())) return;

    // Ignore emoji-only messages
    if (/^[\u{1F300}-\u{1FFFF}\s]+$/u.test(content.trim())) return;

    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const lastXp = xpCooldowns.get(cooldownKey) || 0;
    if (now - lastXp < settings.cooldownSeconds * 1000) return;

    // Duplicate message check
    const msgHash = crypto.createHash('md5').update(content).digest('hex');

    const existing = await prisma.userXP.findUnique({
      where: { guildId_userId: { guildId: message.guild.id, userId: message.author.id } },
    });

    if (existing && existing.lastMessageHash === msgHash) return;

    // Set cooldown
    xpCooldowns.set(cooldownKey, now);

    const xpAmount = Math.floor(
      Math.random() * (settings.maxXpPerMessage - settings.minXpPerMessage + 1) + settings.minXpPerMessage
    );

    const oldLevel = existing ? existing.level : 0;
    const oldTotal = existing ? existing.totalXp : 0;
    const newTotal = oldTotal + xpAmount;
    const newLevel = calcLevel(newTotal);

    await prisma.userXP.upsert({
      where: { guildId_userId: { guildId: message.guild.id, userId: message.author.id } },
      update: {
        totalXp: { increment: xpAmount },
        level: newLevel,
        messageCount: { increment: 1 },
        lastXpAt: new Date(),
        lastMessageHash: msgHash,
        username: message.author.username,
      },
      create: {
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.username,
        totalXp: xpAmount,
        level: newLevel,
        messageCount: 1,
        lastXpAt: new Date(),
        lastMessageHash: msgHash,
      },
    });

    await prisma.xPLog.create({
      data: {
        guildId: message.guild.id,
        userId: message.author.id,
        xpAmount,
        reason: 'message',
      },
    });

    if (newLevel > oldLevel) {
      await handleLevelUp(message.guild, message.member, newLevel, settings, client);
    }
  } catch (err) {
    logger.error('Error in awardXP:', err);
  }
}

async function handleLevelUp(guild, member, newLevel, settings, client) {
  // Assign level role
  const levelRole = await prisma.xPLevelRole.findUnique({
    where: { guildId_level: { guildId: guild.id, level: newLevel } },
  }).catch(() => null);

  if (levelRole) {
    const role = guild.roles.cache.get(levelRole.roleId);
    if (role) {
      await member.roles.add(role).catch(() => {});
    }

    if (settings.removeOldLevelRoles) {
      const allLevelRoles = await prisma.xPLevelRole.findMany({
        where: { guildId: guild.id, level: { lt: newLevel } },
      }).catch(() => []);

      for (const lr of allLevelRoles) {
        const oldRole = guild.roles.cache.get(lr.roleId);
        if (oldRole) {
          await member.roles.remove(oldRole).catch(() => {});
        }
      }
    }
  }

  // Send level-up message
  if (settings.levelUpChannelId) {
    const channel = guild.channels.cache.get(settings.levelUpChannelId);
    if (channel) {
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(GOLD_COLOR)
        .setTitle('🎉 Level Up!')
        .setDescription(`Congrats ${member}, you reached **Level ${newLevel}**!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

async function getUserXP(guildId, userId) {
  return prisma.userXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
}

async function getUserRank(guildId, userId) {
  const all = await prisma.userXP.findMany({
    where: { guildId },
    orderBy: { totalXp: 'desc' },
    take: 1000,
    select: { userId: true },
  });
  const index = all.findIndex(u => u.userId === userId);
  return index === -1 ? null : index + 1;
}

async function getLeaderboard(guildId, limit = 10) {
  return prisma.userXP.findMany({
    where: { guildId },
    orderBy: { totalXp: 'desc' },
    take: limit,
  });
}

function buildProgressBar(currentXp, nextLevelXp, length = 10) {
  const progress = Math.min(currentXp / nextLevelXp, 1);
  const filled = Math.round(progress * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
  calcLevel,
  xpForLevel,
  getXPSettings,
  awardXP,
  getUserXP,
  getUserRank,
  getLeaderboard,
  buildProgressBar,
  handleLevelUp,
};
