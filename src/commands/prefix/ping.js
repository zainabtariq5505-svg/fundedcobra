const embeds = require('../../utils/embeds');

module.exports = {
  name: 'ping',
  description: 'Check bot latency',
  usage: '!ping',

  async execute(message) {
    const sent = await message.reply({ embeds: [embeds.info('Pinging...')] });
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);
    await sent.edit({ embeds: [embeds.ping(latency, apiLatency)] });
  },
};
