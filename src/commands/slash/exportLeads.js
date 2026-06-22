const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { exportLeadsCsv } = require('../../services/exportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');
const { dateOnly } = require('../../utils/formatDate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('export-leads')
    .setDescription('Export all leads as a CSV file (Admin only)'),
  deferred: true,
  adminOnly: true,
  cooldown: 60,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    try {
      const csvBuffer = await exportLeadsCsv(interaction.guild.id);
      const filename  = `fundedcobra-leads-${dateOnly(new Date())}.csv`;

      await auditLog.log({
        guildId: interaction.guild.id, adminId: interaction.user.id,
        action: 'EXPORT_LEADS',
      });

      await interaction.editReply({
        embeds: [embeds.success(`Export ready! **${filename}**`, 'Leads Exported')],
        files: [new AttachmentBuilder(csvBuffer, { name: filename })],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [embeds.error(`Export failed: ${err.message}`)] });
    }
  },
};
