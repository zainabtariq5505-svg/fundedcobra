const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

const guildInviteCache = new Map();

async function getInviteSettings(guildId) {
  return prisma.inviteSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

async function initializeGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const codeMap = new Map();
    invites.forEach((inv) => codeMap.set(inv.code, inv.uses));
    guildInviteCache.set(guild.id, codeMap);
  } catch {
    // silently fail if no MANAGE_GUILD permission
  }
}

async function detectUsedInvite(guild) {
  try {
    const cachedCodes = guildInviteCache.get(guild.id) || new Map();
    const newInvites = await guild.invites.fetch();
    let usedInvite = null;

    newInvites.forEach((inv) => {
      const cachedUses = cachedCodes.get(inv.code) || 0;
      if (inv.uses > cachedUses) {
        usedInvite = inv;
      }
    });

    const updatedMap = new Map();
    newInvites.forEach((inv) => updatedMap.set(inv.code, inv.uses));
    guildInviteCache.set(guild.id, updatedMap);

    return usedInvite;
  } catch {
    return null;
  }
}

async function recordJoin(guild, member, client) {
  try {
    const settings = await getInviteSettings(guild.id);

    if (settings.ignoreBots && member.user.bot) return;

    const invite = await detectUsedInvite(guild);

    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    const accountAgeMinutes = accountAgeMs / 60000;
    const isSuspicious = settings.minAccountAgeMinutes > 0 && accountAgeMinutes < settings.minAccountAgeMinutes;

    let status = 'unknown';
    if (isSuspicious) {
      status = 'suspicious';
    } else if (invite) {
      status = 'pending';
    }

    const log = await prisma.inviteLog.create({
      data: {
        guildId: guild.id,
        inviteCode: invite?.code || 'unknown',
        inviterId: invite?.inviter?.id || null,
        inviterUsername: invite?.inviter?.username || null,
        invitedUserId: member.id,
        invitedUsername: member.user.username,
        status,
        joinedAt: new Date(),
      },
    });

    if (invite?.inviter) {
      await prisma.inviteStats.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: invite.inviter.id } },
        update: {
          totalInvites: { increment: 1 },
          ...(isSuspicious ? { suspiciousInvites: { increment: 1 } } : {}),
          lastInviteAt: new Date(),
          username: invite.inviter.username,
        },
        create: {
          guildId: guild.id,
          userId: invite.inviter.id,
          username: invite.inviter.username,
          totalInvites: 1,
          suspiciousInvites: isSuspicious ? 1 : 0,
          lastInviteAt: new Date(),
        },
      });
    }

    if (settings.inviteLogChannelId) {
      await sendInviteLog(client, guild.id, settings.inviteLogChannelId, {
        type: isSuspicious ? 'suspicious' : 'join',
        member,
        invite,
        accountAgeMinutes,
      });
    }

    if (!isSuspicious && invite?.inviter) {
      if (settings.minStayMinutes > 0) {
        setTimeout(
          () => validatePendingInvite(log.id, guild, settings, client),
          settings.minStayMinutes * 60 * 1000
        );
      } else {
        await validatePendingInvite(log.id, guild, settings, client);
      }
    }
  } catch (err) {
    logger.error(`[inviteService] recordJoin error: ${err.message}`);
  }
}

async function validatePendingInvite(logId, guild, settings, client) {
  try {
    const log = await prisma.inviteLog.findUnique({ where: { id: logId } });
    if (!log || log.status !== 'pending') return;

    try {
      await guild.members.fetch(log.invitedUserId);
    } catch {
      return;
    }

    await prisma.inviteLog.update({
      where: { id: logId },
      data: { status: 'valid', validatedAt: new Date() },
    });

    if (log.inviterId) {
      await prisma.inviteStats.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: log.inviterId } },
        update: { validInvites: { increment: 1 } },
        create: {
          guildId: guild.id,
          userId: log.inviterId,
          username: log.inviterUsername || 'Unknown',
          validInvites: 1,
        },
      });
    }

    if (settings.inviteLogChannelId) {
      await sendInviteLog(client, guild.id, settings.inviteLogChannelId, {
        type: 'valid',
        invitedUserId: log.invitedUserId,
        invitedUsername: log.invitedUsername,
        inviterId: log.inviterId,
        inviterUsername: log.inviterUsername,
      });
    }
  } catch (err) {
    logger.error(`[inviteService] validatePendingInvite error: ${err.message}`);
  }
}

async function recordLeave(guild, member, client) {
  try {
    const log = await prisma.inviteLog.findFirst({
      where: { guildId: guild.id, invitedUserId: member.id, leftAt: null },
      orderBy: { joinedAt: 'desc' },
    });

    if (!log) return;

    await prisma.inviteLog.update({
      where: { id: log.id },
      data: { status: 'left', leftAt: new Date() },
    });

    if (log.inviterId) {
      const wasValid = log.status === 'valid';
      await prisma.inviteStats.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: log.inviterId } },
        update: {
          leftInvites: { increment: 1 },
          ...(wasValid ? { validInvites: { decrement: 1 } } : {}),
        },
        create: {
          guildId: guild.id,
          userId: log.inviterId,
          username: log.inviterUsername || 'Unknown',
          leftInvites: 1,
        },
      });
    }

    const settings = await getInviteSettings(guild.id);
    if (settings.inviteLogChannelId) {
      await sendInviteLog(client, guild.id, settings.inviteLogChannelId, {
        type: 'leave',
        member,
        inviterId: log.inviterId,
        inviterUsername: log.inviterUsername,
      });
    }
  } catch (err) {
    logger.error(`[inviteService] recordLeave error: ${err.message}`);
  }
}

async function sendInviteLog(client, guildId, channelId, data) {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    let color, title, description;

    switch (data.type) {
      case 'join':
        color = 0x00c851;
        title = 'Member Joined';
        description = `<@${data.member.id}> joined using invite \`${data.invite?.code || 'unknown'}\`${data.invite?.inviter ? ` from <@${data.invite.inviter.id}>` : ''}.`;
        break;
      case 'suspicious':
        color = 0xff9800;
        title = 'Suspicious Join';
        description = `<@${data.member.id}> joined with a new account (${Math.floor(data.accountAgeMinutes)} min old) using \`${data.invite?.code || 'unknown'}\`${data.invite?.inviter ? ` from <@${data.invite.inviter.id}>` : ''}.`;
        break;
      case 'leave':
        color = 0xff4444;
        title = 'Member Left';
        description = `<@${data.member.id}> left the server.${data.inviterId ? ` Originally invited by <@${data.inviterId}>.` : ''}`;
        break;
      case 'valid':
        color = 0x00c851;
        title = 'Invite Validated';
        description = `<@${data.invitedUserId}> (${data.invitedUsername}) has stayed long enough — invite by ${data.inviterId ? `<@${data.inviterId}>` : 'Unknown'} is now valid.`;
        break;
      default:
        return;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`[inviteService] sendInviteLog error: ${err.message}`);
  }
}

async function getUserInviteStats(guildId, userId) {
  return prisma.inviteStats.findUnique({ where: { guildId_userId: { guildId, userId } } });
}

async function getLeaderboard(guildId, limit = 10) {
  return prisma.inviteStats.findMany({
    where: { guildId },
    orderBy: { validInvites: 'desc' },
    take: limit,
  });
}

async function resetUserInvites(guildId, userId, username) {
  await prisma.inviteStats.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { totalInvites: 0, validInvites: 0, leftInvites: 0, suspiciousInvites: 0, bonusEntriesEarned: 0 },
    create: { guildId, userId, username },
  });
}

module.exports = {
  guildInviteCache,
  initializeGuildInvites,
  detectUsedInvite,
  recordJoin,
  recordLeave,
  getInviteSettings,
  getUserInviteStats,
  getLeaderboard,
  resetUserInvites,
};
