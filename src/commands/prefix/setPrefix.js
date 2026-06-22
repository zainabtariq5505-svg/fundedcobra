const { checkAdminMessage } = require('../../utils/adminCheck');
const prisma = require('../../database/prisma');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'setprefix',
  aliases: ['set-prefix'],
  description: 'Change the command prefix for this server',
  usage: '!setprefix <new prefix>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const newPrefix = args[0];
    if (!newPrefix) return message.reply({ embeds: [embeds.error('**Usage:** `!setprefix <new prefix>`')] });
    if (newPrefix.length > 5) return message.reply({ embeds: [embeds.error('Prefix must be 5 characters or less.')] });

    await prisma.guildSettings.upsert({
      where:  { guildId: message.guild.id },
      create: { guildId: message.guild.id, prefix: newPrefix },
      update: { prefix: newPrefix },
    });

    await auditLog.log({
      guildId: message.guild.id, adminId: message.author.id,
      action: 'SET_PREFIX', details: `New prefix: ${newPrefix}`,
    });

    await message.reply({
      embeds: [embeds.success(`Prefix updated to \`${newPrefix}\`. Use \`${newPrefix}help\` to see commands.`)],
    });
  },
};
