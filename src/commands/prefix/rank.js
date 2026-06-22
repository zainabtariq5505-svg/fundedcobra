const { EmbedBuilder } = require('discord.js');
const { getUserXP, getUserRank, calcLevel, xpForLevel, buildProgressBar } = require('../../services/xpService');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  name: 'rank',
  aliases: ['level'],
  description: 'Show your XP rank card or another user\'s.',
  usage: '!rank [@user]',
  cooldown: 5,

  async execute(message, args, client, cmdName) {
    const target = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(target.id)
      || await message.guild.members.fetch(target.id).catch(() => null);

    const record = await getUserXP(message.guild.id, target.id);

    if (!record) {
      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle(`⚡ ${target.username}'s Rank`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription('No XP data yet. Start chatting to earn XP!')
        .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const currentLevel = record.level;
    const nextLevel = currentLevel + 1;
    const xpCurrentLevel = xpForLevel(currentLevel);
    const xpNextLevel = xpForLevel(nextLevel);
    const xpIntoLevel = record.totalXp - xpCurrentLevel;
    const xpNeeded = xpNextLevel - xpCurrentLevel;
    const bar = buildProgressBar(xpIntoLevel, xpNeeded, 10);
    const rank = await getUserRank(message.guild.id, target.id);

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

    return message.reply({ embeds: [embed] });
  },
};
