const { checkAdminMessage } = require('../../utils/adminCheck');
const { searchKnowledge } = require('../../services/embeddingService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'kb-search',
  description: 'Search the knowledge base for specific chunks',
  usage: '!kb-search <query>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const query = args.join(' ').trim();
    if (!query) {
      return message.reply({ embeds: [embeds.error('Please provide a search query.')] });
    }

    await message.channel.sendTyping();
    const results = await searchKnowledge(query, message.guild.id, 5);

    if (results.length === 0) {
      return message.reply({ embeds: [embeds.error('No matches found.')] });
    }

    const lines = results.map((r, i) => {
      const score = (r.score * 100).toFixed(1);
      return `**${i + 1}. [${score}%] ${r.chunk.title}**${r.chunk.section ? ` — ${r.chunk.section}` : ''}\n${r.chunk.content.substring(0, 150)}...`;
    });

    await message.reply({ embeds: [embeds.info(lines.join('\n\n'), `Top 5 chunks for: "${query}"`)] });
  },
};
