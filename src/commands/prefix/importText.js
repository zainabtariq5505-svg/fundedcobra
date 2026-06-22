const { checkAdminMessage } = require('../../utils/adminCheck');
const { importFromText } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'import-text',
  aliases: ['importtext'],
  description: 'Import manual text into the knowledge base',
  usage: '!import-text <title> | <text content>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const fullText = args.join(' ').trim();
    if (!fullText.includes('|')) {
      return message.reply({
        embeds: [embeds.error(
          'Format: `!import-text <title> | <text content>`\n\n**Example:**\n`!import-text Refund Policy | Our refund policy is as follows...`'
        )],
      });
    }

    const [titlePart, ...textParts] = fullText.split('|');
    const title = titlePart.trim();
    const text  = textParts.join('|').trim();

    if (!title || !text || text.length < 20) {
      return message.reply({ embeds: [embeds.error('Title and text are both required, and text must be at least 20 characters.')] });
    }

    const statusMsg = await message.reply({ embeds: [embeds.info(`Importing text: **${title}**...`)] });

    try {
      const { source, chunksCreated, skipped } = await importFromText(message.guild.id, text, title, message.author.id);

      await auditLog.log({
        guildId: message.guild.id, adminId: message.author.id,
        action: 'IMPORT_TEXT', target: title,
        details: `Source ID: ${source.id}, Chunks: ${chunksCreated}`,
      });

      if (skipped) {
        return statusMsg.edit({ embeds: [embeds.info(`This content already exists (unchanged).\n**Source ID:** \`${source.id}\``)] });
      }

      await statusMsg.edit({
        embeds: [embeds.success(
          `Imported **${title}**\n**Source ID:** \`${source.id}\`\n**Chunks:** ${chunksCreated}`,
          'Text Imported'
        )],
      });
    } catch (err) {
      await statusMsg.edit({ embeds: [embeds.error(`Import failed: ${err.message}`)] });
    }
  },
};
