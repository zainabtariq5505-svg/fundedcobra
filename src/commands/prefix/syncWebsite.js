const { checkAdminMessage } = require('../../utils/adminCheck');
const { syncWebsite } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

const WEBSITE_URL = 'https://www.fundedcobra.com/';

module.exports = {
  name: 'sync-website',
  aliases: ['syncwebsite'],
  description: 'Crawl and sync the full FundedCobra website',
  usage: '!sync-website',
  adminOnly: true,
  cooldown: 300, // 5 minute cooldown — expensive operation

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const statusMsg = await message.reply({
      embeds: [embeds.info(`Starting website sync for **${WEBSITE_URL}**...\n⏳ This will take a minute. Please wait.`)],
    });

    try {
      const results = await syncWebsite(message.guild.id, WEBSITE_URL, message.author.id);

      const imported = results.filter(r => !r.skipped && !r.error);
      const skipped  = results.filter(r => r.skipped);
      const failed   = results.filter(r => r.error);

      const totalChunks = imported.reduce((sum, r) => sum + (r.chunksCreated || 0), 0);

      await auditLog.log({
        guildId: message.guild.id, adminId: message.author.id,
        action: 'SYNC_WEBSITE', target: WEBSITE_URL,
        details: `Pages: ${results.length}, Imported: ${imported.length}, Skipped: ${skipped.length}, Failed: ${failed.length}, Chunks: ${totalChunks}`,
      });

      const lines = [
        `**Pages scanned:** ${results.length}`,
        `**Pages imported:** ${imported.length}`,
        `**Pages skipped** (unchanged): ${skipped.length}`,
        `**Chunks created:** ${totalChunks}`,
        failed.length > 0 ? `**Failed:** ${failed.length} (check logs)` : null,
      ].filter(Boolean);

      await statusMsg.edit({
        embeds: [embeds.success(lines.join('\n'), 'Website Sync Complete')],
      });
    } catch (err) {
      await statusMsg.edit({ embeds: [embeds.error(`Sync failed: ${err.message}`)] });
    }
  },
};
