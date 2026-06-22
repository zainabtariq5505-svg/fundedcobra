const { searchKnowledge } = require('../../services/embeddingService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');

module.exports = {
  name: 'rules',
  description: 'Search official FundedCobra trading rules',
  usage: '!rules <keyword>',
  cooldown: 5,

  async execute(message, args) {
    const query = args.join(' ').trim();
    if (!query) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle('Official FundedCobra Rules')
          .setDescription('Use `!rules <keyword>` to search the rules database.\n\nExample: `!rules drawdown` or `!rules news trading`')
          .setFooter(FOOTER)],
      });
    }

    await message.channel.sendTyping();
    const results = await searchKnowledge(query, message.guild.id, 5);

    if (results.length === 0 || results[0].score < 0.30) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.ORANGE)
          .setTitle('Rules Search — No Results')
          .setDescription(`No matching rules found for **"${query}"**.\n\nTry a different keyword, or use \`!ask\` for a full AI-powered answer.`)
          .setFooter(FOOTER)],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Rules Search: "${query}"`)
      .setDescription(`Found **${results.length}** matching rule(s):`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const { chunk, score } of results.slice(0, 4)) {
      const conf = score >= 0.75 ? '🟢' : score >= 0.50 ? '🟡' : '🔴';
      embed.addFields({
        name: `${conf} ${truncate(chunk.title, 50)}${chunk.section ? ` — ${truncate(chunk.section, 40)}` : ''} (${(score * 100).toFixed(0)}% match)`,
        value: truncate(chunk.content, 350),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
