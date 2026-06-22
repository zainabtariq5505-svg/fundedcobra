const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const prisma = require('../../database/prisma');
const { getLeadStats } = require('../../services/leadService');
const { COLORS, FOOTER } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot usage statistics (Admin only)'),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const guildId = interaction.guild.id;

    const [
      totalQuestions, lowConfQuestions, leadStats, sourcesCount, chunksCount,
      topIntents, topUsers,
    ] = await Promise.all([
      prisma.questionLog.count({ where: { guildId } }),
      prisma.questionLog.count({ where: { guildId, confidence: { lt: 0.40 } } }),
      getLeadStats(guildId),
      prisma.knowledgeSource.count(),
      prisma.knowledgeChunk.count(),
      prisma.questionLog.groupBy({
        by: ['intent'],
        where: { guildId, intent: { not: null } },
        _count: { intent: true },
        orderBy: { _count: { intent: 'desc' } },
        take: 5,
      }),
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
          value: `Total: **${totalQuestions}**\nLow-confidence: **${lowConfQuestions}**`,
          inline: true,
        },
        {
          name: '👥 Leads',
          value: `Total: **${leadStats.total}**\n🔥 Hot: **${leadStats.hot}** · 🟡 Warm: **${leadStats.warm}**`,
          inline: true,
        },
        {
          name: '📚 Knowledge Base',
          value: `Sources: **${sourcesCount}**\nChunks: **${chunksCount}**`,
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

    await interaction.editReply({ embeds: [embed] });
  },
};
