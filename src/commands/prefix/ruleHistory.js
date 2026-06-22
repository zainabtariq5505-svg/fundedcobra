const { checkAdminMessage } = require('../../utils/adminCheck');
const { getRuleHistory } = require('../../services/ruleImportService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'rule-history',
  description: 'View version history for a knowledge source',
  usage: '!rule-history <sourceId>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const sourceId = args[0];
    if (!sourceId) {
      return message.reply({ embeds: [embeds.error('Usage: `!rule-history <sourceId>`')] });
    }

    const versions = await getRuleHistory(sourceId);
    if (!versions.length) {
      return message.reply({ embeds: [embeds.info(`No versions found for source **${sourceId}**.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle(`Rule History: ${sourceId}`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const version of versions.slice(0, 10)) {
      embed.addFields({
        name: `Version ${version.versionNumber} · ${version.createdBy}`,
        value: truncate(version.rawText, 800),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
