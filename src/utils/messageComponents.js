const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildAnswerActionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('feedback:helpful')
        .setLabel('Helpful')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('feedback:not_helpful')
        .setLabel('Not Helpful')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket:open')
        .setLabel('Open Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('support:contact')
        .setLabel('Contact Support')
        .setEmoji('📞')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buildTicketActionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:claim')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket:close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket:disable_ai')
        .setLabel('Disable AI')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket:transcript')
        .setLabel('Transcript')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

module.exports = { buildAnswerActionRows, buildTicketActionRows };
