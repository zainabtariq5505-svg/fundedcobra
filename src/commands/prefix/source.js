const { checkAdminMessage } = require('../../utils/adminCheck');
const { getSource } = require('../../services/ruleImportService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { formatDate } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'source',
  description: 'View details of a specific knowledge source',
  usage: '!source <id>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const id = args[0];
    if (!id) return message.reply({ embeds: [embeds.error('Please provide a source ID.\n**Usage:** `!source <id>`')] });

    const source = await getSource(id);
    if (!source) return message.reply({ embeds: [embeds.error(`No source found with ID: \`${id}\``)] });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(truncate(source.title, 100))
      .addFields(
        { name: 'ID',      value: `\`${source.id}\``,        inline: true },
        { name: 'Type',    value: source.type,                inline: true },
        { name: 'Chunks',  value: `${source.chunks.length}`,  inline: true },
        { name: 'URL',     value: source.url || 'N/A',        inline: false },
        { name: 'Imported', value: formatDate(source.createdAt), inline: false },
        { name: 'Hash',    value: `\`${source.contentHash.slice(0, 16)}...\``, inline: false },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (source.chunks.length > 0) {
      const preview = source.chunks
        .slice(0, 3)
        .map(c => `**[${c.chunkIndex}]** ${c.section || 'General'}: ${truncate(c.content, 100)}`)
        .join('\n');
      embed.addFields({ name: 'Sample Chunks', value: preview, inline: false });
    }

    await message.reply({ embeds: [embed] });
  },
};
