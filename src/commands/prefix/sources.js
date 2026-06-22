const { checkAdminMessage } = require('../../utils/adminCheck');
const { listSources } = require('../../services/ruleImportService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');

module.exports = {
  name: 'sources',
  description: 'List all knowledge base sources',
  usage: '!sources',
  adminOnly: true,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const sources = await listSources();

    if (sources.length === 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.ORANGE)
          .setTitle('Knowledge Base — No Sources')
          .setDescription('No sources imported yet.\n\nUse `!import-url <url>` or `!sync-website` to import content.')
          .setFooter(FOOTER)],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Knowledge Base — ${sources.length} Source(s)`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const src of sources.slice(0, 20)) {
      embed.addFields({
        name: `\`${src.id.slice(0, 8)}\` ${truncate(src.title, 50)} [${src.type}]`,
        value: [
          src.url ? `🔗 ${truncate(src.url, 60)}` : '📝 Manual text',
          `${src._count.chunks} chunks · Added ${timeAgo(src.createdAt)}`,
        ].join('\n'),
        inline: false,
      });
    }

    if (sources.length > 20) {
      embed.setDescription(`Showing first 20 of ${sources.length} sources.`);
    }

    await message.reply({ embeds: [embed] });
  },
};
