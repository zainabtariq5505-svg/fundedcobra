const { checkAdminMessage } = require('../../utils/adminCheck');
const { importFromUrl } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'import-url',
  aliases: ['importurl'],
  description: 'Import a webpage into the knowledge base',
  usage: '!import-url <url>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const url = args[0];
    if (!url) {
      return message.reply({ embeds: [embeds.error('Please provide a URL.\n**Usage:** `!import-url https://www.fundedcobra.com/rules`')] });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return message.reply({ embeds: [embeds.error(`Invalid URL: \`${url}\``)] });
    }

    const statusMsg = await message.reply({ embeds: [embeds.info(`Importing **${url}**...\nThis may take a moment.`)] });

    try {
      const { source, chunksCreated, skipped } = await importFromUrl(message.guild.id, url, message.author.id);

      await auditLog.log({
        guildId: message.guild.id, adminId: message.author.id,
        action: 'IMPORT_URL', target: url,
        details: `Source ID: ${source.id}, Chunks: ${chunksCreated}, Skipped: ${skipped}`,
      });

      if (skipped) {
        return statusMsg.edit({ embeds: [embeds.info(`This page has already been imported (content unchanged).\n\n**Source ID:** \`${source.id}\`\nUse \`!delete-source ${source.id}\` then re-import to force a refresh.`)] });
      }

      await statusMsg.edit({
        embeds: [embeds.success(
          `Successfully imported **${source.title}**\n\n**Source ID:** \`${source.id}\`\n**Chunks created:** ${chunksCreated}\n**URL:** ${url}`,
          'Import Complete'
        )],
      });
    } catch (err) {
      await statusMsg.edit({ embeds: [embeds.error(`Import failed: ${err.message}`)] });
    }
  },
};
