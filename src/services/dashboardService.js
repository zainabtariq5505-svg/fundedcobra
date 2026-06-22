const prisma = require('../database/prisma');
const logger = require('../utils/logger');

async function safe(fn, fallback = 0) {
  try { return await fn(); } catch { return fallback; }
}

function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function collectStats(guildId, client) {
  const today = startOfToday();
  const weekStart = startOfWeek();

  const [
    joinsToday, joinsWeek,
    questionsToday, questionsWeek,
    unansweredCount, lowConfidenceCount,
    openTickets, closedTicketsToday,
    leadsToday, warmLeads, hotLeads, closedLeads,
    totalSources, totalChunks, lastSync,
    activeGiveaways, endedGiveawaysToday, lastWinner,
    scheduledAnnouncements, lastAnnouncement,
  ] = await Promise.all([
    safe(() => prisma.welcomeLog.count({ where: { guildId, createdAt: { gte: today } } })),
    safe(() => prisma.welcomeLog.count({ where: { guildId, createdAt: { gte: weekStart } } })),
    safe(() => prisma.questionLog.count({ where: { guildId, createdAt: { gte: today } } })),
    safe(() => prisma.questionLog.count({ where: { guildId, createdAt: { gte: weekStart } } })),
    safe(() => prisma.unansweredQuestion.count({ where: { guildId, status: 'open' } })),
    safe(() => prisma.questionLog.count({ where: { guildId, confidence: { lt: 0.40 }, NOT: { confidence: null } } })),
    safe(() => prisma.ticket.count({ where: { guildId, status: 'open' } })),
    safe(() => prisma.ticket.count({ where: { guildId, status: 'closed', closedAt: { gte: today } } })),
    safe(() => prisma.lead.count({ where: { guildId, createdAt: { gte: today } } })),
    safe(() => prisma.lead.count({ where: { guildId, status: 'warm' } })),
    safe(() => prisma.lead.count({ where: { guildId, status: 'hot' } })),
    safe(() => prisma.lead.count({ where: { guildId, status: 'closed' } })),
    safe(() => prisma.knowledgeSource.count()),
    safe(() => prisma.knowledgeChunk.count()),
    safe(() => prisma.knowledgeSource.findFirst({ where: { type: 'website' }, orderBy: { updatedAt: 'desc' } }), null),
    safe(() => prisma.giveaway.count({ where: { guildId, status: 'active' } })),
    safe(() => prisma.giveaway.count({ where: { guildId, status: 'ended', updatedAt: { gte: today } } })),
    safe(() => prisma.giveawayWinner.findFirst({ where: { guildId }, orderBy: { wonAt: 'desc' } }), null),
    safe(() => prisma.announcement.count({ where: { guildId, status: 'scheduled' } })),
    safe(() => prisma.announcement.findFirst({ where: { guildId, status: 'sent' }, orderBy: { sentAt: 'desc' } }), null),
  ]);

  const guild = client?.guilds.cache.get(guildId);
  const totalMembers = guild?.memberCount ?? 0;
  const onlineMembers = guild
    ? guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size
    : 0;
  const totalChannels = guild?.channels.cache.size ?? 0;
  const totalRoles = guild?.roles.cache.size ?? 0;

  return {
    bot: {
      uptime: formatUptime(process.uptime()),
      ping: client?.ws.ping ?? -1,
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    server: { totalMembers, onlineMembers, joinsToday, joinsWeek, totalChannels, totalRoles },
    support: { questionsToday, questionsWeek, openTickets, closedTicketsToday, unansweredCount, lowConfidenceCount },
    leads: { leadsToday, warmLeads, hotLeads, closedLeads },
    kb: {
      totalSources,
      totalChunks,
      lastSync: lastSync ? lastSync.updatedAt : null,
    },
    giveaways: {
      activeGiveaways,
      endedGiveawaysToday,
      lastWinner: lastWinner ? `${lastWinner.username} (<t:${Math.floor(new Date(lastWinner.wonAt).getTime() / 1000)}:R>)` : 'None',
    },
    announcements: {
      scheduledAnnouncements,
      lastSent: lastAnnouncement
        ? `${lastAnnouncement.title.slice(0, 40)} (<t:${Math.floor(new Date(lastAnnouncement.sentAt).getTime() / 1000)}:R>)`
        : 'None',
    },
  };
}

module.exports = { collectStats };
