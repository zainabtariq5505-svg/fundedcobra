const { checkAdminMessage } = require('../../utils/adminCheck');
const { exportLeadsCsv } = require('../../services/exportService');
const auditLog = require('../../services/auditLogService');
const { AttachmentBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { dateOnly } = require('../../utils/formatDate');

module.exports = {
  name: 'export-leads',
  aliases: ['exportleads'],
  description: 'Export all leads as a CSV file',
  usage: '!export-leads',
  adminOnly: true,
  cooldown: 60,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const statusMsg = await message.reply({ embeds: [embeds.info('Generating leads export...')] });

    try {
      const csvBuffer = await exportLeadsCsv(message.guild.id);
      const filename  = `fundedcobra-leads-${message.guild.id}-${dateOnly(new Date())}.csv`;

      await auditLog.log({
        guildId: message.guild.id, adminId: message.author.id,
        action: 'EXPORT_LEADS',
      });

      await statusMsg.edit({
        embeds: [embeds.success(`Export ready! **${filename}**`, 'Leads Exported')],
        files: [new AttachmentBuilder(csvBuffer, { name: filename })],
      });
    } catch (err) {
      await statusMsg.edit({ embeds: [embeds.error(`Export failed: ${err.message}`)] });
    }
  },
};
