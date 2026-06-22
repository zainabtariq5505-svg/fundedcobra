const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-transcript-channel')
    .setDescription('Set the channel where ticket transcripts are posted. (Admin only)')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send transcripts to.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');

    await prisma.transcriptSettings.upsert({
      where: { guildId: interaction.guild.id },
      update: { transcriptChannelId: channel.id },
      create: { guildId: interaction.guild.id, transcriptChannelId: channel.id },
    });

    return interaction.reply({ content: `✅ Transcript channel set to <#${channel.id}>.`, ephemeral: true });
  },
};
