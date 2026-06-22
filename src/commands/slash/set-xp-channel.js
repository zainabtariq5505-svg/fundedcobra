const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-xp-channel')
    .setDescription('Restrict XP earning to a specific channel (admin only).')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where XP is earned (text channels only)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id },
    }).catch(() => null);

    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    await interaction.deferReply();

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    await prisma.xPSettings.upsert({
      where: { guildId },
      update: { xpChannelId: channel.id },
      create: { guildId, xpChannelId: channel.id },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(`✅ XP will now only be earned in <#${channel.id}>.`)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
