const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { importFromUrl } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import-url')
    .setDescription('Import a webpage into the knowledge base (Admin only)')
    .addStringOption(opt =>
      opt.setName('url')
         .setDescription('The URL to import (must be fundedcobra.com domain)')
         .setRequired(true)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const url = interaction.options.getString('url');
    try { new URL(url); } catch {
      return interaction.editReply({ embeds: [embeds.error(`Invalid URL: \`${url}\``)] });
    }

    try {
      const { source, chunksCreated, skipped } = await importFromUrl(url, interaction.user.id);

      await auditLog.log({
        guildId: interaction.guild.id, adminId: interaction.user.id,
        action: 'IMPORT_URL', target: url,
        details: `Source ID: ${source.id}, Chunks: ${chunksCreated}`,
      });

      if (skipped) {
        return interaction.editReply({ embeds: [embeds.info(`Already imported (unchanged).\n**Source ID:** \`${source.id}\``)] });
      }

      await interaction.editReply({
        embeds: [embeds.success(`Imported **${source.title}**\n**ID:** \`${source.id}\`\n**Chunks:** ${chunksCreated}`, 'Import Complete')],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [embeds.error(`Import failed: ${err.message}`)] });
    }
  },
};
