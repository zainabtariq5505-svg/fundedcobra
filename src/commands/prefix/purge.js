const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  name: 'purge',
  aliases: ['clear'],
  description: 'Delete multiple messages from the channel',
  usage: '!purge <amount 1-100>',

  async execute(message, args, client) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ embeds: [embeds.error('Please specify a number between **1** and **100**.')] });
    }

    if (!message.channel.permissionsFor(message.guild.members.me).has('ManageMessages')) {
      return message.reply({ embeds: [embeds.error('I need **Manage Messages** permission to purge messages.')] });
    }

    await message.delete().catch(() => {});
    const deleted = await message.channel.bulkDelete(amount, true).catch(err => {
      return message.channel.send({ embeds: [embeds.error(`Purge failed: ${err.message}`)] });
    });

    if (!deleted) return;

    const count = deleted.size ?? amount;
    const mc = await createCase({
      guildId:   message.guild.id,
      actionType: 'purge',
      target:    { id: message.channel.id, tag: `#${message.channel.name}`, username: `#${message.channel.name}` },
      moderator: message.author,
      reason:    `Purged ${count} messages in #${message.channel.name}`,
    });
    await sendModLog(client, message.guild.id, buildModEmbed({
      caseId:    mc.caseId,
      actionType: 'purge',
      target:    { id: message.channel.id, tag: `#${message.channel.name}` },
      moderator: message.author,
      reason:    `Purged ${count} messages in #${message.channel.name}`,
      extra:     [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }],
    }));

    const notice = await message.channel.send({ embeds: [embeds.success(`🗑️ Deleted **${count}** message(s).`)] });
    setTimeout(() => notice.delete().catch(() => {}), 4000);
  },
};
