const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const logger = require('../../utils/logger');

const ACCENT_COLOR = 0x0099ff;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-invite-log')
    .setDescription('Set the channel for invite log messages (admin only)')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('The channel to send invite logs to').setRequired(true)
    ),

  async execute(interaction) {
    try {
      const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
      if (!isAdmin(interaction.member, settings?.adminRoleId)) {
        return interaction.reply({ content: 'Admin only.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');

      await prisma.inviteSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { inviteLogChannelId: channel.id },
        create: { guildId: interaction.guild.id, inviteLogChannelId: channel.id },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle('Invite Log Channel Set')
        .setDescription(`Invite log channel set to <#${channel.id}>.`)
        .setFooter(FOOTER)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[/set-invite-log] error: ${err.message}`);
      return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    }
  },
};
