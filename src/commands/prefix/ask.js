const { processQuestion } = require('../../services/ragAnswerService');
const embeds = require('../../utils/embeds');
const { buildAnswerActionRows } = require('../../utils/messageComponents');

module.exports = {
  name: 'ask',
  description: 'Ask the AI a question about FundedCobra',
  usage: '!ask <question>',
  cooldown: 8,

  async execute(message, args, client) {
    const question = args.join(' ').trim();
    if (!question) {
      return message.reply({ embeds: [embeds.error('Please provide a question.\n**Usage:** `!ask <your question>`')] });
    }
    if (question.length < 5) {
      return message.reply({ embeds: [embeds.error('Your question is too short. Please be more specific.')] });
    }

    // Show typing indicator while processing
    await message.channel.sendTyping();

    const result = await processQuestion({
      question,
      guildId:     message.guild?.id || 'dm',
      channelId:   message.channel.id,
      userId:      message.author.id,
      username:    message.author.username,
      displayName: message.member?.displayName || message.author.username,
      client,
    });

    const { answer, intent, confidence, isOfficialRule, sourceName, sourceUrl } = result;

    let embed;
    if (isOfficialRule || confidence >= 0.40) {
      embed = embeds.ruleAnswer({ question, answer, sourceName, sourceUrl, confidence, intent });
    } else {
      embed = embeds.uncertainAnswer({ answer, intent });
    }

    // Handle very long answers — split if needed
    const lines = answer.split('\n');
    if (answer.length > 3900) {
      const chunks = embeds.splitLongAnswer(answer, 3900);
      for (let i = 0; i < chunks.length; i++) {
        const e = i === 0 ? embed.setDescription(chunks[0]) : embeds.base().setDescription(chunks[i]);
        await message.reply({ embeds: [e], components: i === 0 ? buildAnswerActionRows() : [] });
      }
    } else {
      await message.reply({ embeds: [embed], components: buildAnswerActionRows() });
    }
  },
};
