const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  name: 'lock',
  aliases: ['unlock', 'slowmode'],
  description: 'Lock, unlock, or set slowmode on the current channel',
  usage: '!lock [reason] | !unlock [reason] | !slowmode <seconds>',

  async execute(message, args, client, cmdName) {
    if (!message.guild) return;
    if (!await isModerator(message.member, message.guild.id)) {
      return message.reply({ embeds: [embeds.error('You need Moderator or Administrator permission to use this command.')] });
    }

    const cmd = cmdName?.replace(/-/g, '').toLowerCase();

    if (!message.channel.permissionsFor(message.guild.members.me).has('ManageChannels')) {
      return message.reply({ embeds: [embeds.error('I need **Manage Channels** permission to do this.')] });
    }

    // ── !slowmode ─────────────────────────────────────────────────────────────────
    if (cmd === 'slowmode') {
      const secs = parseInt(args[0]);
      if (isNaN(secs) || secs < 0 || secs > 21600) {
        return message.reply({ embeds: [embeds.error('Please specify seconds between **0** (off) and **21600** (6 hours).')] });
      }
      await message.channel.setRateLimitPerUser(secs, `Slowmode set by ${message.author.tag}`);
      const mc = await createCase({ guildId: message.guild.id, actionType: 'slowmode', target: { id: message.channel.id, tag: `#${message.channel.name}`, username: `#${message.channel.name}` }, moderator: message.author, reason: secs === 0 ? 'Slowmode disabled' : `Slowmode set to ${secs}s` });
      await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'slowmode', target: { id: message.channel.id, tag: `#${message.channel.name}` }, moderator: message.author, reason: mc.reason, extra: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }, { name: 'Slowmode', value: secs === 0 ? 'Disabled' : `${secs} seconds`, inline: true }] }));
      return message.reply({ embeds: [embeds.success(secs === 0 ? `🐌 Slowmode disabled in <#${message.channel.id}>.` : `🐌 Slowmode set to **${secs}s** in <#${message.channel.id}>.`)] });
    }

    // ── !unlock ────────────────────────────────────────────────────────────────────
    if (cmd === 'unlock') {
      const reason = args.join(' ') || 'No reason provided';
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }, { reason });
      const mc = await createCase({ guildId: message.guild.id, actionType: 'unlock', target: { id: message.channel.id, tag: `#${message.channel.name}`, username: `#${message.channel.name}` }, moderator: message.author, reason });
      await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unlock', target: { id: message.channel.id, tag: `#${message.channel.name}` }, moderator: message.author, reason, extra: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }] }));
      return message.reply({ embeds: [embeds.success(`🔓 <#${message.channel.id}> has been **unlocked**.`)] });
    }

    // ── !lock ──────────────────────────────────────────────────────────────────────
    const reason = args.join(' ') || 'No reason provided';
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason });
    const mc = await createCase({ guildId: message.guild.id, actionType: 'lock', target: { id: message.channel.id, tag: `#${message.channel.name}`, username: `#${message.channel.name}` }, moderator: message.author, reason });
    await sendModLog(client, message.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'lock', target: { id: message.channel.id, tag: `#${message.channel.name}` }, moderator: message.author, reason, extra: [{ name: 'Channel', value: `<#${message.channel.id}>`, inline: true }] }));
    return message.reply({ embeds: [embeds.success(`🔒 <#${message.channel.id}> has been **locked**.`)] });
  },
};
