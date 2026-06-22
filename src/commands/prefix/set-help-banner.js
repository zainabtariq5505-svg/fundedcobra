const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminMessage } = require('../../utils/adminCheck');

module.exports = {
  name: 'set-help-banner',
  aliases: ['sethelpbanner'],
  description: 'Set the help menu banner image URL',
  usage: '!set-help-banner <image_url>',

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;
    const url = args[0];
    if (!url || !url.startsWith('http')) return message.reply({ embeds: [embeds.error('Usage: `!set-help-banner <image_url>`\n\nProvide a valid image URL (https://...).')]});

    await prisma.helpMenuSettings.upsert({
      where:  { guildId: message.guild.id },
      create: { guildId: message.guild.id, bannerUrl: url },
      update: { bannerUrl: url },
    });

    return message.reply({ embeds: [embeds.success(`Help menu banner updated.\n\n[Preview](${url})`)] });
  },
};
