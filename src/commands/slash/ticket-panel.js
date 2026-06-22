const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { COLORS, FOOTER } = require('../../utils/embeds');
const { getTicketSettings } = require('../../services/ticketService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Sends the premium ticket panel embed.')
    .setDefaultMemberPermissions('0'), // Admin only

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('FundedCobra Support Center')
      .setDescription('Need help? Open a ticket below and our AI assistant will help you immediately while our support team reviews your inquiry.')
      .setThumbnail('https://www.fundedcobra.com/logo.png')
      .setImage('https://www.fundedcobra.com/banner.png')
      .setFooter(FOOTER);

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket:panel:select')
          .setPlaceholder('Select a category to open a ticket...')
          .addOptions([
            { label: 'General Support', value: 'General Support', emoji: '❔' },
            { label: 'Rules Question', value: 'Rules Question', emoji: '📜' },
            { label: 'Payout Issue', value: 'Payout Issue', emoji: '💸' },
            { label: 'Payment Issue', value: 'Payment Issue', emoji: '💳' },
            { label: 'Account Issue', value: 'Account Issue', emoji: '👤' },
            { label: 'Refund Request', value: 'Refund Request', emoji: '↩️' },
            { label: 'Partnership / Affiliate', value: 'Partnership / Affiliate', emoji: '🤝' },
            { label: 'Giveaway Support', value: 'Giveaway Support', emoji: '🎉' },
            { label: 'Other', value: 'Other', emoji: '❓' },
          ])
      );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: 'Ticket panel sent.', ephemeral: true });
  },
};
