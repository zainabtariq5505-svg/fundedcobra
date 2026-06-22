const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserInviteStats } = require('../../services/inviteService');
const logger = require('../../utils/logger');

const ACCENT_COLOR = 0x0099ff;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-stats')
    .setDescription('View invite stats for yourself or another user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check invite stats for').setRequired(false)
    ),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const stats = await getUserInviteStats(interaction.guild.id, target.id);

      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle('🔗 Invite Stats')
        .setDescription(`Stats for <@${target.id}>`)
        .addFields(
          { name: 'Total Invites', value: String(stats?.totalInvites ?? 0), inline: true },
          { name: 'Valid Invites', value: String(stats?.validInvites ?? 0), inline: true },
          { name: 'Left', value: String(stats?.leftInvites ?? 0), inline: true },
          { name: 'Suspicious', value: String(stats?.suspiciousInvites ?? 0), inline: true },
          { name: 'Bonus Entries', value: String(stats?.bonusEntriesEarned ?? 0), inline: true }
        )
        .setFooter(FOOTER)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[/invite-stats] error: ${err.message}`);
      return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    }
  },
};
