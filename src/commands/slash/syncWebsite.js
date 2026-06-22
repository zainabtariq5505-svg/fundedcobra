const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { syncWebsite } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

const WEBSITE_URL = 'https://www.fundedcobra.com/';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-website')
    .setDescription('Crawl and sync the full FundedCobra website into the knowledge base (Admin only)'),
  deferred: true,
  adminOnly: true,
  cooldown: 300,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    try {
      const results = await syncWebsite(WEBSITE_URL, interaction.user.id);
      const imported = results.filter(r => !r.skipped && !r.error);
      const skipped  = results.filter(r => r.skipped);
      const failed   = results.filter(r => r.error);
      const totalChunks = imported.reduce((sum, r) => sum + (r.chunksCreated || 0), 0);

      await auditLog.log({
        guildId: interaction.guild.id, adminId: interaction.user.id,
        action: 'SYNC_WEBSITE', target: WEBSITE_URL,
        details: `Pages: ${results.length}, Imported: ${imported.length}, Chunks: ${totalChunks}`,
      });

      await interaction.editReply({
        embeds: [embeds.success([
          `**Pages scanned:** ${results.length}`,
          `**Pages imported:** ${imported.length}`,
          `**Skipped** (unchanged): ${skipped.length}`,
          `**Chunks created:** ${totalChunks}`,
          failed.length ? `**Failed:** ${failed.length}` : null,
        ].filter(Boolean).join('\n'), 'Website Sync Complete')],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [embeds.error(`Sync failed: ${err.message}`)] });
    }
  },
};
