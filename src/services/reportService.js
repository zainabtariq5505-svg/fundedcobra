const { EmbedBuilder } = require('discord.js');
const prisma = require('../database/prisma');
const { getGuildSettings } = require('./settingsService');
const { COLORS, FOOTER } = require('../utils/embeds');

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

async function buildDailyReport(guildId) {
  const since = startOfToday();
  const [totalQuestions, lowConfidenceQuestions, newLeads, hotLeads, ticketsOpened, unansweredNew, importedRules, topIntents] = await Promise.all([
    prisma.questionLog.count({ where: { guildId, createdAt: { gte: since } } }),
    prisma.questionLog.count({ where: { guildId, createdAt: { gte: since }, confidence: { lt: 0.4 } } }),
    prisma.lead.count({ where: { guildId, createdAt: { gte: since } } }),
    prisma.lead.count({ where: { guildId, createdAt: { gte: since }, status: 'hot' } }),
    prisma.ticket.count({ where: { guildId, createdAt: { gte: since } } }),
    prisma.unansweredQuestion.count({ where: { guildId, createdAt: { gte: since } } }),
    prisma.knowledgeSource.count({ where: { createdAt: { gte: since } } }),
    prisma.questionLog.groupBy({
      by: ['intent'],
      where: { guildId, createdAt: { gte: since }, intent: { not: null } },
      _count: { intent: true },
      orderBy: { _count: { intent: 'desc' } },
      take: 5,
    }).catch(() => []),
  ]);

  return {
    since,
    totalQuestions,
    lowConfidenceQuestions,
    newLeads,
    hotLeads,
    ticketsOpened,
    unansweredNew,
    importedRules,
    topIntents,
  };
}

function buildDailyReportEmbed(report) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('Daily Admin Report')
    .setFooter(FOOTER)
    .setTimestamp();

  embed.addFields(
    { name: 'Questions Today', value: `${report.totalQuestions}`, inline: true },
    { name: 'New Leads', value: `${report.newLeads}`, inline: true },
    { name: 'Hot Leads', value: `${report.hotLeads}`, inline: true },
    { name: 'Tickets Opened', value: `${report.ticketsOpened}`, inline: true },
    { name: 'Low-Confidence', value: `${report.lowConfidenceQuestions}`, inline: true },
    { name: 'Unanswered New', value: `${report.unansweredNew}`, inline: true },
    { name: 'Imported Rules', value: `${report.importedRules}`, inline: true },
  );

  if (report.topIntents?.length) {
    const top = report.topIntents
      .map(row => `${row.intent || 'general'}: ${row._count.intent}`)
      .join('\n');
    embed.addFields({ name: 'Top Topics', value: top.slice(0, 1000), inline: false });
  }

  return embed;
}

async function sendDailyReport(client, guildId) {
  const settings = await getGuildSettings(guildId);
  const channelId = settings.adminReportChannelId || settings.leadChannelId || settings.supportChannelId;
  if (!channelId) return false;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId) || await guild?.channels.fetch(channelId).catch(() => null);
  if (!channel) return false;

  const report = await buildDailyReport(guildId);
  await channel.send({ embeds: [buildDailyReportEmbed(report)] }).catch(() => {});
  return true;
}

function scheduleDailyReports(client, hour = 9, minute = 0) {
  const schedule = async () => {
    for (const [guildId] of client.guilds.cache) {
      await sendDailyReport(client, guildId).catch(() => {});
    }
  };

  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(hour, minute, 0, 0);
  if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

  setTimeout(() => {
    schedule().catch(() => {});
    setInterval(() => schedule().catch(() => {}), 24 * 60 * 60 * 1000);
  }, nextRun.getTime() - now.getTime());
}

module.exports = { buildDailyReport, sendDailyReport, scheduleDailyReports };
