const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  name: 'blacklist',
  aliases: ['unblacklist'],
  description: 'Blacklist or remove a user from the blacklist',
  usage: '!blacklist <@user> <reason> | !unblacklist <@user>',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    // ── !unblacklist ───────────────────────────────────────────────────────────────
    if (cmd === 'unblacklist') {
      const target = message.mentions.members.first() || message.mentions.users.first();
      const userId = target?.id ?? args[0];
      if (!userId) return message.reply({ embeds: [embeds.error('Usage: `!unblacklist <@user>`')] });

      const entry = await prisma.blacklist.findUnique({ where: { guildId_userId: { guildId: message.guild.id, userId } } });
      if (!entry || !entry.active) return message.reply({ embeds: [embeds.error('This user is not blacklisted.')] });

      await prisma.blacklist.update({ where: { id: entry.id }, data: { active: false } });
      return message.reply({ embeds: [embeds.success(`✅ **${entry.username}** has been removed from the blacklist.`)] });
    }

    // ── !blacklist ─────────────────────────────────────────────────────────────────
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!blacklist <@user> <reason>`')] });
    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [embeds.error('Please provide a reason for blacklisting this user.')] });

    await prisma.blacklist.upsert({
      where:  { guildId_userId: { guildId: message.guild.id, userId: target.id } },
      create: { guildId: message.guild.id, userId: target.id, username: target.user.tag, reason, addedBy: message.author.id, active: true },
      update: { reason, addedBy: message.author.id, active: true },
    });

    return message.reply({ embeds: [embeds.success(`🚫 **${target.user.username}** has been blacklisted.\n**Reason:** ${reason}\n\n*This user is now blocked from opening tickets, entering giveaways, and using sensitive commands.*`)] });
  },
};
