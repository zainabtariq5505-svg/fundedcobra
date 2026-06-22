const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-ticket-log')
    .setDescription('Set ticket log channel')
    .setDefaultMemberPermissions('0')
    .addChannelOption(opt => opt.setName('channel').setDescription('The channel').setRequired(true)),
  async execute(interaction) {
    const value = interaction.options.getChannel('channel').id;
    await prisma.ticketSettings.upsert({
      where: { guildId: interaction.guild.id },
      update: { ticketLogChannelId: value },
      create: { guildId: interaction.guild.id, ticketLogChannelId: value }
    });
    return interaction.reply({ content: '✅ Settings updated.', ephemeral: true });
  }
};
