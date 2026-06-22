const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const logger = require('../../utils/logger');

const ACCENT_COLOR = 0x0099ff;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-bonus-enable')
    .setDescription('Enable giveaway bonus invites (admin only)'),

  async execute(interaction) {
    try {
      const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null);
      if (!isAdmin(interaction.member, settings?.adminRoleId)) {
        return interaction.reply({ content: 'Admin only.', ephemeral: true });
      }

      await prisma.inviteSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { giveawayBonusEnabled: true },
        create: { guildId: interaction.guild.id, giveawayBonusEnabled: true },
      });

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle('Invite Bonus Enabled')
        .setDescription('Giveaway bonus invites have been **enabled**.')
        .setFooter(FOOTER)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[/invite-bonus-enable] error: ${err.message}`);
      return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    }
  },
};
