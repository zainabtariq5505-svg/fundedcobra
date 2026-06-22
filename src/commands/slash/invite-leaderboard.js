const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../services/inviteService');
const logger = require('../../utils/logger');

const GOLD_COLOR = 0xffd700;
const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-leaderboard')
    .setDescription('Show the top 10 inviters in the server'),

  async execute(interaction) {
    try {
      const entries = await getLeaderboard(interaction.guild.id, 10);

      const description = entries.length
        ? entries.map((u, i) => `${i + 1}. <@${u.userId}> — **${u.validInvites}** valid (${u.totalInvites} total)`).join('\n')
        : 'No invite data yet.';

      const embed = new EmbedBuilder()
        .setColor(GOLD_COLOR)
        .setTitle('🏆 Invite Leaderboard')
        .setDescription(description)
        .setFooter(FOOTER)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[/invite-leaderboard] error: ${err.message}`);
      return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
    }
  },
};
