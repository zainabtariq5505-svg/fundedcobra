const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { listSources } = require('../../services/ruleImportService');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sources')
    .setDescription('List all imported knowledge base sources (Admin only)'),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const sources = await listSources();

    if (sources.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.ORANGE)
          .setTitle('Knowledge Base — No Sources')
          .setDescription('No sources imported yet. Use `/import-url` or `/sync-website` to add content.')
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

    await interaction.editReply({ embeds: [embed] });
  },
};
