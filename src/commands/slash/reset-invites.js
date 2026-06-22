const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const { resetUserInvites } = require('../../services/inviteService');
const logger = require('../../utils/logger');

const ACCENT_COLOR = 0x0099ff;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-invites')
    .setDescription('Reset a user\'s invite stats (admin only)')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user whose stats to reset').setRequired(true)
    ),

  async execute(interaction) {
    try {
      const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
      if (!isAdmin(interaction.member, settings?.adminRoleId)) {
        return interaction.reply({ content: 'Admin only.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      await resetUserInvites(interaction.guild.id, target.id, target.username);

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle('Invite Stats Reset')
        .setDescription(`Invite stats for <@${target.id}> have been reset to zero.`)
        .setFooter(FOOTER)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[/reset-invites] error: ${err.message}`);
      return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    }
  },
};
