const { checkAdminMessage } = require('../../utils/adminCheck');
const { processQuestion } = require('../../services/ragAnswerService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'kb-test',
  description: 'Test the knowledge base RAG pipeline end-to-end',
  usage: '!kb-test <query>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const query = args.join(' ').trim() || 'What platform does FundedCobra use?';

    const statusMsg = await message.reply({ embeds: [embeds.info(`Running RAG test for: "${query}"...`)] });

    try {
      const result = await processQuestion({
        question: query,
        guildId: message.guild.id,
        channelId: message.channel.id,
        userId: message.author.id,
        username: message.author.username,
        displayName: message.member.displayName,
      });

      const lines = [
        `**Query:** ${query}`,
        `**Intent:** ${result.intent}`,
        `**Confidence:** ${(result.confidence * 100).toFixed(1)}%`,
        `**Is Official Rule:** ${result.isOfficialRule ? '✅ Yes' : '❌ No'}`,
        `**Source:** ${result.sourceName || 'None'}`,
        `\n**Answer:**\n${result.answer.substring(0, 500)}...`
      ];

      await statusMsg.edit({ embeds: [embeds.success(lines.join('\n'), 'RAG Test Complete')] });
    } catch (err) {
      await statusMsg.edit({ embeds: [embeds.error(`Test failed: ${err.message}`)] });
    }
  },
};
