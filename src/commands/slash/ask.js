const { SlashCommandBuilder } = require('discord.js');
const { processQuestion } = require('../../services/ragAnswerService');
const embeds = require('../../utils/embeds');
const { buildAnswerActionRows } = require('../../utils/messageComponents');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the FundedCobra AI a question about rules, payouts, accounts, and more')
    .addStringOption(opt =>
      opt.setName('question')
         .setDescription('Your question')
         .setRequired(true)
         .setMaxLength(800)
    ),
  deferred: true,
  cooldown: 8,

  async execute(interaction, client) {
    const question = interaction.options.getString('question');

    const result = await processQuestion({
      question,
      guildId:     interaction.guild?.id || 'dm',
      channelId:   interaction.channel?.id || 'unknown',
      userId:      interaction.user.id,
      username:    interaction.user.username,
      displayName: interaction.member?.displayName || interaction.user.username,
      client,
    });

    const { answer, intent, confidence, isOfficialRule, sourceName, sourceUrl } = result;

    let embed;
    if (isOfficialRule || confidence >= 0.40) {
      embed = embeds.ruleAnswer({ question, answer, sourceName, sourceUrl, confidence, intent });
    } else {
      embed = embeds.uncertainAnswer({ answer, intent });
    }

    // Handle very long answers
    if (answer.length > 3900) {
      const chunks = embeds.splitLongAnswer(answer, 3900);
      await interaction.editReply({ embeds: [embed.setDescription(chunks[0])], components: buildAnswerActionRows() });
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ embeds: [embeds.base().setDescription(chunks[i])] });
      }
    } else {
      await interaction.editReply({ embeds: [embed], components: buildAnswerActionRows() });
    }
  },
};
