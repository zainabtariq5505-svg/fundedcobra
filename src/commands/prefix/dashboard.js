const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminMessage } = require('../../utils/adminCheck');
const { collectStats } = require('../../services/dashboardService');
const { COLORS, FOOTER } = require('../../utils/embeds');

function buildDashboardEmbeds(stats) {
  const ping = stats.bot.ping;
  const pingStatus = ping < 0 ? '❓ Unknown' : ping < 100 ? `🟢 ${ping}ms` : ping < 250 ? `🟡 ${ping}ms` : `🔴 ${ping}ms`;

  const main = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('⚡ FundedCobra Server Dashboard')
    .setDescription('Live snapshot of your server, bot, and business metrics.')
    .addFields(
      {
        name: '🤖 Bot Status',
        value: [
          `**Status:** 🟢 Online`,
          `**Uptime:** ${stats.bot.uptime}`,
          `**Ping:** ${pingStatus}`,
          `**Memory:** ${stats.bot.memoryMB} MB`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🌐 Server Stats',
        value: [
          `**Members:** ${stats.server.totalMembers}`,
          `**Online:** ${stats.server.onlineMembers || '—'}`,
          `**Joins Today:** ${stats.server.joinsToday}`,
          `**Joins This Week:** ${stats.server.joinsWeek}`,
          `**Channels:** ${stats.server.totalChannels}`,
          `**Roles:** ${stats.server.totalRoles}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🎧 Support Stats',
        value: [
          `**Questions Today:** ${stats.support.questionsToday}`,
          `**Questions This Week:** ${stats.support.questionsWeek}`,
          `**Open Tickets:** ${stats.support.openTickets}`,
          `**Tickets Closed Today:** ${stats.support.closedTicketsToday}`,
          `**Unanswered Qs:** ${stats.support.unansweredCount}`,
          `**Low Confidence Answers:** ${stats.support.lowConfidenceCount}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🔥 Lead / Sales Stats',
        value: [
          `**New Leads Today:** ${stats.leads.leadsToday}`,
          `**Warm Leads:** ${stats.leads.warmLeads}`,
          `**Hot Leads:** ${stats.leads.hotLeads}`,
          `**Converted:** ${stats.leads.closedLeads}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '📚 Knowledge Base',
        value: [
          `**Sources:** ${stats.kb.totalSources}`,
          `**Chunks:** ${stats.kb.totalChunks}`,
          `**Last Sync:** ${stats.kb.lastSync ? `<t:${Math.floor(new Date(stats.kb.lastSync).getTime() / 1000)}:R>` : 'Never'}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🎁 Giveaways',
        value: [
          `**Active:** ${stats.giveaways.activeGiveaways}`,
          `**Ended Today:** ${stats.giveaways.endedGiveawaysToday}`,
          `**Last Winner:** ${stats.giveaways.lastWinner}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '📣 Announcements',
        value: [
          `**Scheduled:** ${stats.announcements.scheduledAnnouncements}`,
          `**Last Sent:** ${stats.announcements.lastSent}`,
        ].join('\n'),
        inline: true,
      },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  return main;
}

function buildRefreshButton(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dashboard:refresh:${guildId}`)
      .setLabel('🔄 Refresh Dashboard')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  name: 'dashboard',
  aliases: ['server-health', 'bot-status'],
  description: 'Show the FundedCobra server health dashboard',
  usage: '!dashboard',
  adminOnly: true,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const typing = message.channel.sendTyping().catch(() => {});
    const stats = await collectStats(message.guild.id, message.client);
    await typing;

    const embed = buildDashboardEmbeds(stats);
    const row = buildRefreshButton(message.guild.id);

    await message.reply({ embeds: [embed], components: [row] });
  },
};

module.exports.buildDashboardEmbeds = buildDashboardEmbeds;
module.exports.buildRefreshButton = buildRefreshButton;
