const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');
const { EmbedBuilder } = require('discord.js');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

module.exports = {
  name: 'watch',
  aliases: ['unwatch'],
  description: 'Add or remove a user from the watchlist',
  usage: '!watch <@user> <reason> | !unwatch <@user>',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    // ── !unwatch ──────────────────────────────────────────────────────────────────
    if (cmd === 'unwatch') {
      const target = message.mentions.members.first() || message.mentions.users.first();
      const userId = target?.id ?? args[0];
      if (!userId) return message.reply({ embeds: [embeds.error('Usage: `!unwatch <@user>`')] });

      const entry = await prisma.watchlist.findUnique({ where: { guildId_userId: { guildId: message.guild.id, userId } } });
      if (!entry || !entry.active) return message.reply({ embeds: [embeds.error('This user is not on the watchlist.')] });

      await prisma.watchlist.update({ where: { id: entry.id }, data: { active: false } });
      return message.reply({ embeds: [embeds.success(`✅ Removed from watchlist.`)] });
    }

    // ── !watch ─────────────────────────────────────────────────────────────────────
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embeds.error('Usage: `!watch <@user> <reason>`')] });
    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [embeds.error('Please provide a reason for watching this user.')] });

    await prisma.watchlist.upsert({
      where:  { guildId_userId: { guildId: message.guild.id, userId: target.id } },
      create: { guildId: message.guild.id, userId: target.id, username: target.user.tag, reason, addedBy: message.author.id, active: true },
      update: { reason, addedBy: message.author.id, active: true },
    });

    return message.reply({ embeds: [embeds.success(`👁️ **${target.user.username}** has been added to the watchlist.\n**Reason:** ${reason}`)] });
  },
};
