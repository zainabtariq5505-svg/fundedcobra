const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { PLATFORM_ICONS } = require('../../services/socialNotifierService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-add')
    .setDescription('Add a social media account to monitor')
    .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
      { name: 'YouTube',   value: 'youtube'   },
      { name: 'Instagram', value: 'instagram' },
      { name: 'X/Twitter', value: 'x'         },
      { name: 'TikTok',    value: 'tiktok'    },
    ))
    .addStringOption(o => o.setName('handle').setDescription('Channel ID (YouTube: UCxxxxxx) or handle (@username)').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const platform = interaction.options.getString('platform');
    const handle   = interaction.options.getString('handle');
    const guildId  = interaction.guild.id;

    let externalId = null, accountUrl = null;
    if (platform === 'youtube') {
      const match = handle.match(/(?:youtube\.com\/channel\/|^)(UC[a-zA-Z0-9_-]{22})/);
      if (!match) return interaction.reply({ embeds: [embeds.error('For YouTube, provide the channel ID (starts with UC...).')], ephemeral: true });
      externalId = match[1];
      accountUrl = `https://www.youtube.com/channel/${externalId}`;
    }

    if (platform === 'instagram' || platform === 'tiktok') {
      await interaction.reply({ embeds: [embeds.info(`**${platform} API Setup Required**\n\nAccount saved, but notifications require official API configuration. Contact your developer.`)] });
    }

    const account = await prisma.socialAccount.create({
      data: { guildId, platform, accountName: handle.replace('@', ''), accountHandle: handle.replace('@', ''), accountUrl, externalAccountId: externalId, createdBy: interaction.user.id },
    });

    if (platform !== 'instagram' && platform !== 'tiktok') {
      return interaction.reply({ embeds: [embeds.success(`${PLATFORM_ICONS[platform] ?? '📡'} **${platform}** account \`${handle}\` added!\n\nID: \`${account.id.slice(-8)}\`\nSet your channel: \`/social-channel\``)] });
    }
  },
};
