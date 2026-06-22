const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserXP, getUserRank, calcLevel, xpForLevel, buildProgressBar } = require('../../services/xpService');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your XP rank card or another user\'s.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check (defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const record = await getUserXP(interaction.guild.id, target.id);

    if (!record) {
      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle(`⚡ ${target.username}'s Rank`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription('No XP data yet. Start chatting to earn XP!')
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const currentLevel = record.level;
    const nextLevel = currentLevel + 1;
    const xpCurrentLevel = xpForLevel(currentLevel);
    const xpNextLevel = xpForLevel(nextLevel);
    const xpIntoLevel = record.totalXp - xpCurrentLevel;
    const xpNeeded = xpNextLevel - xpCurrentLevel;
    const bar = buildProgressBar(xpIntoLevel, xpNeeded, 10);
    const rank = await getUserRank(interaction.guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setTitle(`⚡ ${target.username}'s Rank`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏆 Level', value: `${currentLevel}`, inline: true },
        { name: '✨ Total XP', value: record.totalXp.toLocaleString(), inline: true },
        { name: '📊 Server Rank', value: rank ? `#${rank}` : 'Unranked', inline: true },
        { name: '⏭️ Next Level XP', value: `${Math.ceil(xpNextLevel).toLocaleString()}`, inline: true },
        { name: '💬 Messages', value: record.messageCount.toLocaleString(), inline: true },
        { name: '​', value: '​', inline: true },
        {
          name: `Progress to Level ${nextLevel}`,
          value: `\`${bar}\` ${xpIntoLevel.toLocaleString()} / ${Math.ceil(xpNeeded).toLocaleString()} XP`,
          inline: false,
        },
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
