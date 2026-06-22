const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban a user (ban + immediate unban to clear recent messages)')
    .addUserOption(o => o.setName('user').setDescription('The user to softban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found.')], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });
    if (!target.bannable) return interaction.reply({ embeds: [embeds.error('I cannot ban this user.')], ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await dmUser(target.user, embeds.error(`You have been softbanned from **${interaction.guild.name}** (recent messages removed).\n\n**Reason:** ${reason}`, 'Softbanned'));
    await target.ban({ reason, deleteMessageSeconds: 7 * 24 * 60 * 60 });
    await interaction.guild.members.unban(target.id, 'Softban — immediate unban').catch(() => {});

    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'softban', target: target.user, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'softban', target: target.user, moderator: interaction.user, reason }));
    return interaction.reply({ embeds: [embeds.success(`🔨 **${target.user.username}** has been softbanned.\n**Reason:** ${reason}`)] });
  },
};
