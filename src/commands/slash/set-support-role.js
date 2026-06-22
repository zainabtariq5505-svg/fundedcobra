const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-support-role')
    .setDescription('Set support role')
    .setDefaultMemberPermissions('0')
    .addRoleOption(opt => opt.setName('role').setDescription('The role').setRequired(true)),
  async execute(interaction) {
    const value = interaction.options.getRole('role').id;
    await prisma.ticketSettings.upsert({
      where: { guildId: interaction.guild.id },
      update: { supportRoleId: value },
      create: { guildId: interaction.guild.id, supportRoleId: value }
    });
    return interaction.reply({ content: '✅ Settings updated.', ephemeral: true });
  }
};
