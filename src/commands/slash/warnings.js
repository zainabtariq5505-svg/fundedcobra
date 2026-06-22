const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View active warnings for a user')
    .addUserOption(o => o.setName('user').setDescription('The user to check').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const warns = await prisma.warning.findMany({ where: { guildId: interaction.guild.id, targetUserId: user.id, active: true }, orderBy: { createdAt: 'desc' } });

    if (!warns.length) return interaction.reply({ embeds: [embeds.success(`**${user.username}** has no active warnings.`)], ephemeral: true });

    const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`⚠️ Warnings — ${user.username} (${warns.length})`).setThumbnail(user.displayAvatarURL()).setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' }).setTimestamp();
    for (const [i, w] of warns.slice(0, 10).entries()) {
      embed.addFields({ name: `#${i + 1} — <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:D>`, value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>`, inline: false });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
