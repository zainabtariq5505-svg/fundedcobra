const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { PLATFORM_ICONS } = require('../../services/socialNotifierService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-list')
    .setDescription('List all monitored social accounts'),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const accounts = await prisma.socialAccount.findMany({ where: { guildId: interaction.guild.id }, orderBy: { createdAt: 'asc' } });
    if (!accounts.length) return interaction.reply({ embeds: [embeds.info('No social accounts. Use `/social-add` to add one.')], ephemeral: true });

    const embed = new EmbedBuilder().setColor(0x1A1A2E).setTitle('📱 Social Media Accounts').setFooter({ text: '@fundedcobra' }).setTimestamp();
    for (const acc of accounts) {
      const icon = PLATFORM_ICONS[acc.platform] ?? '📡';
      const status = acc.enabled ? '🟢' : '🔴';
      const last = acc.lastCheckedAt ? `<t:${Math.floor(new Date(acc.lastCheckedAt).getTime() / 1000)}:R>` : 'Never';
      embed.addFields({ name: `${status} ${icon} ${acc.accountName} (${acc.platform})`, value: `ID: \`${acc.id.slice(-8)}\` · Checked: ${last}`, inline: true });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
