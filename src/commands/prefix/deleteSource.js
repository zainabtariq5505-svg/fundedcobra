const { checkAdminMessage } = require('../../utils/adminCheck');
const { deleteSource, getSource } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'delete-source',
  aliases: ['deletesource'],
  description: 'Delete a knowledge source and all its chunks',
  usage: '!delete-source <id>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const id = args[0];
    if (!id) return message.reply({ embeds: [embeds.error('Please provide a source ID.\n**Usage:** `!delete-source <id>`')] });

    const source = await getSource(id);
    if (!source) return message.reply({ embeds: [embeds.error(`No source found with ID: \`${id}\``)] });

    await deleteSource(id);

    await auditLog.log({
      guildId: message.guild.id, adminId: message.author.id,
      action: 'DELETE_SOURCE', target: id,
      details: `Title: ${source.title}, URL: ${source.url || 'N/A'}`,
    });

    await message.reply({
      embeds: [embeds.success(`Deleted source **${source.title}** and all ${source.chunks.length} chunks.`, 'Source Deleted')],
    });
  },
};
