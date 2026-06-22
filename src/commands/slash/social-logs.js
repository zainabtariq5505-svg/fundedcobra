const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { PLATFORM_ICONS } = require('../../services/socialNotifierService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-logs')
    .setDescription('View recent social notification logs'),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const logs = await prisma.socialNotificationLog.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { account: true },
    });

    if (!logs.length) return interaction.reply({ embeds: [embeds.info('No notification logs yet.')], ephemeral: true });

    const embed = new EmbedBuilder().setColor(0x1A1A2E).setTitle('📋 Social Notification Logs').setFooter({ text: '@fundedcobra' }).setTimestamp();
    for (const log of logs) {
      const icon   = PLATFORM_ICONS[log.platform] ?? '📡';
      const status = log.status === 'success' ? '✅' : '❌';
      const time   = log.createdAt ? `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>` : '';
      embed.addFields({
        name:  `${status} ${icon} ${log.account?.accountName ?? log.platform} ${time}`,
        value: log.url ? `[Post](${log.url})` + (log.errorMessage ? `\nError: ${log.errorMessage.slice(0, 100)}` : '') : (log.errorMessage?.slice(0, 100) || 'OK'),
        inline: false,
      });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
