const { EmbedBuilder } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');

async function logTicketEvent(client, guildId, embed) {
  try {
    const settings = await prisma.ticketSettings.findUnique({ where: { guildId } });
    if (!settings || !settings.ticketLogChannelId) return;

    const channel = await client.channels.fetch(settings.ticketLogChannelId).catch(() => null);
    if (!channel) return;

    embed.setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' }).setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Failed to log ticket event:', err.message);
  }
}

module.exports = { logTicketEvent };
