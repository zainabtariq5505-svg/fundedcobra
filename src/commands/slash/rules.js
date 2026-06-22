const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchKnowledge } = require('../../services/embeddingService');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Search the official FundedCobra trading rules')
    .addStringOption(opt =>
      opt.setName('keyword')
         .setDescription('Search keyword (e.g. drawdown, news trading, leverage)')
         .setRequired(true)
         .setMaxLength(200)
    ),
  deferred: true,
  cooldown: 5,

  async execute(interaction) {
    const query   = interaction.options.getString('keyword');
    const results = await searchKnowledge(query, interaction.guild?.id, 5);

    if (results.length === 0 || results[0].score < 0.30) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.ORANGE)
          .setTitle('Rules Search — No Results')
          .setDescription(`No matching rules found for **"${query}"**.\n\nTry a different keyword, or use \`/ask\` for a full AI-powered answer.`)
          .setFooter(FOOTER)],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Rules: "${query}"`)
      .setDescription(`Found **${results.length}** matching rule(s):`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const { chunk, score } of results.slice(0, 4)) {
      const conf = score >= 0.75 ? '🟢' : score >= 0.50 ? '🟡' : '🔴';
      embed.addFields({
        name: `${conf} ${truncate(chunk.title, 50)}${chunk.section ? ` — ${truncate(chunk.section, 40)}` : ''} (${(score * 100).toFixed(0)}%)`,
        value: truncate(chunk.content, 350),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
