const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  name: 'kick',
  description: 'Kick a user from the server',
  usage: '!kick <@user> [reason]',

  async execute(message, args, client) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!kick <@user> [reason]`')] });

    const check = checkHierarchy(message.guild, message.member, target);
    if (!check.ok) return message.reply({ embeds: [embeds.error(check.reason)] });

    if (!target.kickable) return message.reply({ embeds: [embeds.error('I do not have permission to kick this user.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await dmUser(target.user, embeds.error(`You have been kicked from **${message.guild.name}**.\n\n**Reason:** ${reason}`, 'Kicked'));
    await target.kick(reason);

    const mc = await createCase({ guildId: message.guild.id, actionType: 'kick', target: target.user, moderator: message.author, reason });
    await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'kick', target: target.user, moderator: message.author, reason }));

    return message.reply({ embeds: [embeds.success(`👢 **${target.user.username}** has been kicked.\n**Reason:** ${reason}`)] });
  },
};
