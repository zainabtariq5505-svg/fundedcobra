const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminMessage } = require('../../utils/adminCheck');

module.exports = {
  name: 'set-modlog',
  aliases: ['setmodlog'],
  description: 'Set the moderation log channel',
  usage: '!set-modlog #channel',

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply({ embeds: [embeds.error('Usage: `!set-modlog #channel`')] });

    await prisma.modSettings.upsert({
      where:  { guildId: message.guild.id },
      create: { guildId: message.guild.id, modLogChannelId: channel.id },
      update: { modLogChannelId: channel.id },
    });

    return message.reply({ embeds: [embeds.success(`Moderation log channel set to <#${channel.id}>.\n\nAll moderation actions will be logged there.`)] });
  },
};
