const { EmbedBuilder } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

const ACTION_COLORS = {
  warn: 0xFFD700, warnings: 0xFFD700, clearwarns: 0x00FF88,
  mute: 0xFF8C00, timeout: 0xFF8C00, unmute: 0x00FF88,
  kick: 0xFF4444, ban: 0xFF0000, unban: 0x00FF88, softban: 0xFF4444,
  purge: 0x7B00FF, lock: 0xFF8C00, unlock: 0x00FF88, slowmode: 0x1A1A2E,
  watch: 0xFFD700, unwatch: 0x00FF88, blacklist: 0xFF0000, unblacklist: 0x00FF88,
};

const ACTION_ICONS = {
  warn: '⚠️', warnings: '📋', clearwarns: '🧹',
  mute: '🔇', timeout: '⏱️', unmute: '🔊',
  kick: '👢', ban: '🔨', unban: '✅', softban: '🔨',
  purge: '🗑️', lock: '🔒', unlock: '🔓', slowmode: '🐌',
  watch: '👁️', unwatch: '✅', blacklist: '🚫', unblacklist: '✅',
};

// ── Duration helpers ───────────────────────────────────────────────────────────

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return val * mult[unit];
}

function formatDuration(ms) {
  if (!ms) return null;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// ── Database helpers ───────────────────────────────────────────────────────────

async function getModSettings(guildId) {
  return prisma.modSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

async function getNextCaseId(guildId) {
  const last = await prisma.moderationCase.findFirst({
    where: { guildId },
    orderBy: { caseId: 'desc' },
  });
  return (last?.caseId ?? 0) + 1;
}

async function createCase({ guildId, actionType, target, moderator, reason, duration, expiresAt }) {
  const caseId = await getNextCaseId(guildId);
  return prisma.moderationCase.create({
    data: {
      guildId,
      caseId,
      actionType,
      targetUserId: target.id,
      targetUsername: target.tag ?? target.username,
      moderatorId: moderator.id,
      moderatorUsername: moderator.tag ?? moderator.username,
      reason: reason || 'No reason provided',
      duration: duration ?? null,
      expiresAt: expiresAt ?? null,
      status: 'active',
    },
  });
}

// ── Embed builder ──────────────────────────────────────────────────────────────

function buildModEmbed({ caseId, actionType, target, moderator, reason, duration, expiresAt, extra }) {
  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[actionType] ?? 0x1A1A2E)
    .setTitle(`${ACTION_ICONS[actionType] ?? '⚖️'} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} | Case #${caseId}`)
    .addFields(
      { name: 'Target',    value: `<@${target.id}> \`${target.tag ?? target.username}\``,     inline: true },
      { name: 'Moderator', value: `<@${moderator.id}> \`${moderator.tag ?? moderator.username}\``, inline: true },
      { name: 'Reason',    value: reason || 'No reason provided', inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  if (duration)  embed.addFields({ name: 'Duration', value: duration, inline: true });
  if (expiresAt) embed.addFields({ name: 'Expires',  value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`, inline: true });
  if (extra)     for (const f of extra) embed.addFields(f);

  return embed;
}

// ── Mod log sender ─────────────────────────────────────────────────────────────

async function sendModLog(client, guildId, embed) {
  try {
    const settings = await getModSettings(guildId);
    if (!settings.modLogChannelId) return;
    const ch = await client.channels.fetch(settings.modLogChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
  } catch (err) {
    logger.warn(`sendModLog failed: ${err.message}`);
  }
}

// ── DM helper ─────────────────────────────────────────────────────────────────

async function dmUser(user, embed) {
  try { await user.send({ embeds: [embed] }); return true; }
  catch { return false; }
}

// ── Hierarchy check ────────────────────────────────────────────────────────────

function checkHierarchy(guild, moderator, target) {
  if (target.id === guild.ownerId)
    return { ok: false, reason: 'Cannot take action against the server owner.' };
  if (target.id === guild.client.user.id)
    return { ok: false, reason: 'Cannot take action against myself.' };
  if (
    moderator.id !== guild.ownerId &&
    moderator.roles.highest.position <= target.roles.highest.position
  ) return { ok: false, reason: 'Your highest role must be above the target\'s highest role.' };
  if (guild.members.me.roles.highest.position <= target.roles.highest.position)
    return { ok: false, reason: 'My highest role is not above the target\'s role — I cannot take this action.' };
  return { ok: true };
}

// ── Permission check ───────────────────────────────────────────────────────────

async function isModerator(member, guildId) {
  const { isAdmin } = require('../config/permissions');
  const [gs, modSettings] = await Promise.all([
    prisma.guildSettings.findUnique({ where: { guildId } }).catch(() => null),
    getModSettings(guildId).catch(() => null),
  ]);
  if (isAdmin(member, gs?.adminRoleId)) return true;
  if (modSettings?.moderatorRoleId && member.roles.cache.has(modSettings.moderatorRoleId)) return true;
  if (gs?.supportRoleId && member.roles.cache.has(gs.supportRoleId)) return true;
  return false;
}

// ── Auto-warn threshold actions ────────────────────────────────────────────────

async function handleAutoWarn(guild, target, warningCount, client) {
  try {
    const settings = await getModSettings(guild.id);
    if (!settings.autoWarnEnabled) return;
    let thresholds;
    try { thresholds = JSON.parse(settings.warnThresholds); } catch { return; }
    const threshold = thresholds[String(warningCount)];
    if (!threshold) return;

    const botUser = guild.client.user;

    if (threshold === 'timeout_1h') {
      const ms = 3_600_000;
      const expiresAt = new Date(Date.now() + ms);
      await target.timeout(ms, `Auto-action: ${warningCount} warnings`).catch(() => {});
      const mc = await createCase({ guildId: guild.id, actionType: 'timeout', target, moderator: botUser, reason: `Auto-action: ${warningCount} warnings reached`, duration: '1 hour', expiresAt });
      await sendModLog(client, guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'timeout', target, moderator: botUser, reason: mc.reason, duration: '1 hour', expiresAt }));
    } else if (threshold === 'timeout_1d') {
      const ms = 86_400_000;
      const expiresAt = new Date(Date.now() + ms);
      await target.timeout(ms, `Auto-action: ${warningCount} warnings`).catch(() => {});
      const mc = await createCase({ guildId: guild.id, actionType: 'timeout', target, moderator: botUser, reason: `Auto-action: ${warningCount} warnings reached`, duration: '1 day', expiresAt });
      await sendModLog(client, guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'timeout', target, moderator: botUser, reason: mc.reason, duration: '1 day', expiresAt }));
    } else if (threshold === 'alert_staff') {
      const modSettings = await getModSettings(guild.id);
      const channelId = modSettings.modLogChannelId;
      if (!channelId) return;
      const ch = await guild.client.channels.fetch(channelId).catch(() => null);
      if (!ch?.isTextBased()) return;
      const gs = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } }).catch(() => null);
      const ping = gs?.supportRoleId ? `<@&${gs.supportRoleId}>` : '@here';
      await ch.send({
        content: ping,
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('⚠️ Warning Threshold Alert')
          .setDescription(`<@${target.id}> has reached **${warningCount} warnings** and requires staff attention.`)
          .setFooter(FOOTER)
          .setTimestamp()],
      });
    }
  } catch (err) {
    logger.warn(`handleAutoWarn failed: ${err.message}`);
  }
}

// ── Temp-ban scheduler ─────────────────────────────────────────────────────────

async function processTempBans(client) {
  try {
    const expired = await prisma.moderationCase.findMany({
      where: {
        actionType: 'ban',
        status: 'active',
        expiresAt: { lte: new Date() },
      },
    });
    for (const mc of expired) {
      try {
        const guild = await client.guilds.fetch(mc.guildId).catch(() => null);
        if (!guild) continue;
        await guild.members.unban(mc.targetUserId, 'Temporary ban expired').catch(() => {});
        await prisma.moderationCase.update({ where: { id: mc.id }, data: { status: 'expired' } });
        const botUser = guild.client.user;
        const caseRec = await createCase({ guildId: mc.guildId, actionType: 'unban', target: { id: mc.targetUserId, tag: mc.targetUsername, username: mc.targetUsername }, moderator: botUser, reason: 'Temporary ban expired' });
        await sendModLog(client, mc.guildId, buildModEmbed({ caseId: caseRec.caseId, actionType: 'unban', target: { id: mc.targetUserId, tag: mc.targetUsername }, moderator: botUser, reason: 'Temporary ban expired' }));
      } catch (err) {
        logger.warn(`processTempBans: ${err.message}`);
      }
    }
  } catch (err) {
    logger.warn(`processTempBans outer: ${err.message}`);
  }
}

module.exports = {
  parseDuration,
  formatDuration,
  getModSettings,
  getNextCaseId,
  createCase,
  buildModEmbed,
  sendModLog,
  dmUser,
  checkHierarchy,
  isModerator,
  handleAutoWarn,
  processTempBans,
};
