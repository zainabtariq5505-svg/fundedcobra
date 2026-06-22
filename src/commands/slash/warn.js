const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser, handleAutoWarn } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(o => o.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = interaction.guild.members.cache.get(interaction.options.getUser('user').id)
      || await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found in this server.')], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    const reason = interaction.options.getString('reason');

    await prisma.warning.create({
      data: { guildId: interaction.guild.id, targetUserId: target.id, targetUsername: target.user.tag, moderatorId: interaction.user.id, moderatorUsername: interaction.user.tag, reason, active: true },
    });
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'warn', target: target.user, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'warn', target: target.user, moderator: interaction.user, reason }));

    const activeWarns = await prisma.warning.count({ where: { guildId: interaction.guild.id, targetUserId: target.id, active: true } });
    await dmUser(target.user, embeds.error(`You have received a warning in **${interaction.guild.name}**.\n\n**Reason:** ${reason}\n\n*You now have ${activeWarns} active warning(s).*`, 'Warning'));

    await interaction.reply({ embeds: [embeds.success(`⚠️ **${target.user.username}** has been warned. (${activeWarns} total)\n**Reason:** ${reason}`)] });
    await handleAutoWarn(interaction.guild, target, activeWarns, client);
  },
};
