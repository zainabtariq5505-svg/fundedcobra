const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../services/xpService');

const GOLD_COLOR = 0xFFD700;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-leaderboard')
    .setDescription('Show the top 10 XP leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply();

    const top = await getLeaderboard(interaction.guild.id, 10);

    if (!top.length) {
      const embed = new EmbedBuilder()
        .setColor(GOLD_COLOR)
        .setTitle('🏆 XP Leaderboard')
        .setDescription('No XP data yet. Start chatting!')
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const rows = top
      .map((u, i) =>
        `${i + 1}. <@${u.userId}> — Level **${u.level}** · ${u.totalXp.toLocaleString()} XP · ${u.messageCount} msgs`
      )
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(GOLD_COLOR)
      .setTitle('🏆 XP Leaderboard')
      .setDescription(rows)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
