const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  cooldown: 5,

  async execute(interaction) {
    const start = Date.now();
    await interaction.reply({ embeds: [embeds.info('Pinging...')], fetchReply: true });
    const latency    = Date.now() - start;
    const apiLatency = Math.round(interaction.client.ws.ping);
    await interaction.editReply({ embeds: [embeds.ping(latency, apiLatency)] });
  },
};
