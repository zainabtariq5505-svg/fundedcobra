const { checkAdminMessage } = require('../../utils/adminCheck');
const { compareRuleVersions } = require('../../services/ruleImportService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'compare-rule',
  description: 'Compare two rule versions',
  usage: '!compare-rule <oldVersionId> <newVersionId>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const [oldVersionId, newVersionId] = args;
    if (!oldVersionId || !newVersionId) {
      return message.reply({ embeds: [embeds.error('Usage: `!compare-rule <oldVersionId> <newVersionId>`')] });
    }

    const result = await compareRuleVersions(oldVersionId, newVersionId);
    const embed = new EmbedBuilder()
      .setColor(COLORS.GOLD)
      .setTitle('Rule Comparison')
      .addFields(
        { name: 'Old Version', value: `${result.oldVersion.id}\nLines: ${result.summary.oldLines}`, inline: true },
        { name: 'New Version', value: `${result.newVersion.id}\nLines: ${result.summary.newLines}`, inline: true },
        { name: 'Line Delta', value: `${result.summary.lineDelta >= 0 ? '+' : ''}${result.summary.lineDelta}`, inline: true },
        { name: 'Old Preview', value: truncate(result.summary.oldPreview || 'No content', 900), inline: false },
        { name: 'New Preview', value: truncate(result.summary.newPreview || 'No content', 900), inline: false },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
