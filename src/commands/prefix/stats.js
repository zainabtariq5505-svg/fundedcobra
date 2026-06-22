const { checkAdminMessage } = require('../../utils/adminCheck');
const prisma = require('../../database/prisma');
const { getLeadStats } = require('../../services/leadService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER } = require('../../utils/embeds');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'stats',
  description: 'View bot usage statistics',
  usage: '!stats',
  adminOnly: true,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const guildId = message.guild.id;

    const [
      totalQuestions, lowConfQuestions, leadStats, sourcesCount, chunksCount,
      topIntents, topUsers,
    ] = await Promise.all([
      prisma.questionLog.count({ where: { guildId } }),
      prisma.questionLog.count({ where: { guildId, confidence: { lt: 0.40 } } }),
      getLeadStats(guildId),
      prisma.knowledgeSource.count(),
      prisma.knowledgeChunk.count(),
      // Top 5 intents
      prisma.questionLog.groupBy({
        by: ['intent'],
        where: { guildId, intent: { not: null } },
        _count: { intent: true },
        orderBy: { _count: { intent: 'desc' } },
        take: 5,
      }),
      // Top 5 active users
      prisma.questionLog.groupBy({
        by: ['userId', 'username'],
        where: { guildId },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle('FundedCobra Bot — Statistics')
      .addFields(
        {
          name: '💬 Questions',
          value: [
            `Total: **${totalQuestions}**`,
            `Low-confidence: **${lowConfQuestions}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '👥 Leads',
          value: [
            `Total leads: **${leadStats.total}**`,
            `Hot: **${leadStats.hot}**  Warm: **${leadStats.warm}**  New: **${leadStats.new}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '📚 Knowledge Base',
          value: [
            `Sources: **${sourcesCount}**`,
            `Chunks:  **${chunksCount}**`,
          ].join('\n'),
          inline: true,
        },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (topIntents.length > 0) {
      embed.addFields({
        name: '🎯 Top Intents',
        value: topIntents.map(i => `**${i.intent}**: ${i._count.intent}`).join('\n'),
        inline: true,
      });
    }

    if (topUsers.length > 0) {
      embed.addFields({
        name: '🏆 Most Active Users',
        value: topUsers.map(u => `**${u.username}**: ${u._count.userId} questions`).join('\n'),
        inline: true,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
