const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-ticket-category')
    .setDescription('Set ticket category')
    .setDefaultMemberPermissions('0')
    .addChannelOption(opt => opt.setName('category').setDescription('The category').setRequired(true)),
  async execute(interaction) {
    const value = interaction.options.getChannel('category').id;
    await prisma.ticketSettings.upsert({
      where: { guildId: interaction.guild.id },
      update: { ticketCategoryId: value },
      create: { guildId: interaction.guild.id, ticketCategoryId: value }
    });
    return interaction.reply({ content: '✅ Settings updated.', ephemeral: true });
  }
};
