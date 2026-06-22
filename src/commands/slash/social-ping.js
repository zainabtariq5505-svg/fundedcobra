const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-ping')
    .setDescription('Set the ping for social notifications')
    .addStringOption(o => o.setName('type').setDescription('Ping type').setRequired(true).addChoices(
      { name: 'No ping',    value: 'none'     },
      { name: '@everyone', value: 'everyone' },
      { name: '@here',     value: 'here'     },
      { name: 'Role',      value: 'role'     },
    ))
    .addRoleOption(o => o.setName('role').setDescription('Role to ping (required if type is Role)').setRequired(false)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const pingType  = interaction.options.getString('type');
    const role      = interaction.options.getRole('role');
    const pingRoleId = pingType === 'role' ? role?.id : null;
    if (pingType === 'role' && !role) return interaction.reply({ embeds: [embeds.error('Please select a role when using type "Role".')], ephemeral: true });

    if (pingType === 'everyone' || pingType === 'here') {
      await interaction.reply({ embeds: [embeds.info(`⚠️ Enabled **@${pingType}** ping for social notifications. This will ping everyone when new content is posted.`)] });
    }

    await prisma.socialNotifierSettings.upsert({ where: { guildId: interaction.guild.id }, create: { guildId: interaction.guild.id, pingType, pingRoleId }, update: { pingType, pingRoleId } });
    if (pingType !== 'everyone' && pingType !== 'here') {
      const label = pingType === 'role' ? `<@&${pingRoleId}>` : 'none';
      return interaction.reply({ embeds: [embeds.success(`Ping set to **${label}**.`)], ephemeral: true });
    }
  },
};
