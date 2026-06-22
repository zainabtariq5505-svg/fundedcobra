const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminMessage } = require('../../utils/adminCheck');

module.exports = {
  name: 'set-help-thumbnail',
  aliases: ['sethelpthumbnail'],
  description: 'Set the help menu thumbnail image URL',
  usage: '!set-help-thumbnail <image_url>',

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;
    const url = args[0];
    if (!url || !url.startsWith('http')) return message.reply({ embeds: [embeds.error('Usage: `!set-help-thumbnail <image_url>`')]});

    await prisma.helpMenuSettings.upsert({
      where:  { guildId: message.guild.id },
      create: { guildId: message.guild.id, thumbnailUrl: url },
      update: { thumbnailUrl: url },
    });

    return message.reply({ embeds: [embeds.success(`Help menu thumbnail updated.\n\n[Preview](${url})`)] });
  },
};
