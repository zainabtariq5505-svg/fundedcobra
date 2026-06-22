const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-ticket-ai-mode')
    .setDescription('Set default ticket AI mode')
    .setDefaultMemberPermissions('0')
    .addStringOption(opt => opt.setName('mode').setDescription('Mode').addChoices(
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
    ).setRequired(true)),
  async execute(interaction) {
    const value = interaction.options.getString('mode') === 'on';
    await prisma.ticketSettings.upsert({
      where: { guildId: interaction.guild.id },
      update: { aiEnabledByDefault: value },
      create: { guildId: interaction.guild.id, aiEnabledByDefault: value }
    });
    return interaction.reply({ content: '✅ Settings updated.', ephemeral: true });
  }
};
