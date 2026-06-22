const { EmbedBuilder } = require('discord.js');
const { PermissionsBitField } = require('discord.js');
const { closeTicket, findTicketByChannelId } = require('../../services/ticketService');
const { generateManualTranscript, getTranscriptSettings, getUserTranscripts } = require('../../services/transcriptService');
const { isModerator } = require('../../services/moderationService');
const { isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

async function checkModOrManage(message) {
  if (message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return true;
  const mod = await isModerator(message.member, message.guild.id).catch(() => false);
  return mod;
}

async function checkAdmin(message) {
  const settings = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
  return isAdmin(message.member, settings?.adminRoleId);
}

module.exports = {
  name: 'transcript',
  aliases: ['close', 'close-ticket', 'ticket-transcript', 'set-transcript-channel', 'transcripts'],
  description: 'Ticket transcript management commands.',

  async execute(message, args, client, cmdName) {
    const cmd = cmdName || 'transcript';

    // !close / !close-ticket — close current ticket with transcript
    if (cmd === 'close' || cmd === 'close-ticket') {
      const allowed = await checkModOrManage(message);
      if (!allowed) {
        return message.reply({ content: 'You need Manage Channels or moderator permissions to close tickets.' });
      }

      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket || ticket.status !== 'open') {
        return message.reply({ content: 'This channel is not an open ticket.' });
      }

      await message.reply({ content: '🔒 Closing ticket and generating transcript...' });
      await closeTicket(message.channel, message.author.id, client);
      return;
    }

    // !transcript — generate transcript for current channel
    if (cmd === 'transcript') {
      const allowed = await checkModOrManage(message);
      if (!allowed) {
        return message.reply({ content: 'You need Manage Channels or moderator permissions to generate transcripts.' });
      }

      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) {
        return message.reply({ content: 'This channel is not a ticket channel.' });
      }

      await message.reply({ content: '📋 Generating transcript...' });
      const record = await generateManualTranscript(message.channel, ticket, message.author.id, client);

      if (!record) {
        return message.channel.send({ content: '❌ Failed to generate transcript.' });
      }

      const settings = await getTranscriptSettings(message.guild.id);
      if (settings.transcriptChannelId) {
        return message.channel.send({ content: `✅ Transcript generated and sent to <#${settings.transcriptChannelId}>.` });
      }
      return message.channel.send({ content: `✅ Transcript generated (${record.messageCount} messages). No transcript channel is configured — use \`!set-transcript-channel\` to set one.` });
    }

    // !ticket-transcript <ticketId> — admin only, look up transcript metadata
    if (cmd === 'ticket-transcript') {
      const admin = await checkAdmin(message);
      if (!admin) {
        return message.reply({ content: 'Admin only.' });
      }

      const ticketId = args[0];
      if (!ticketId) {
        return message.reply({ content: 'Usage: `!ticket-transcript <ticketId>`' });
      }

      const record = await prisma.ticketTranscript.findFirst({
        where: {
          guildId: message.guild.id,
          ticketId: { contains: ticketId },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return message.reply({ content: `No transcript found for ticket ID containing \`${ticketId}\`.` });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Ticket Transcript')
        .addFields(
          { name: 'Ticket ID', value: record.ticketId.slice(-8), inline: true },
          { name: 'User', value: `<@${record.userId}> (${record.username})`, inline: true },
          { name: 'Messages', value: String(record.messageCount), inline: true },
          { name: 'Closed By', value: record.closedBy ? `<@${record.closedBy}>` : 'Unknown', inline: true },
          { name: 'Opened', value: record.openedAt ? new Date(record.openedAt).toLocaleString() : 'N/A', inline: true },
          { name: 'Closed', value: record.closedAt ? new Date(record.closedAt).toLocaleString() : 'N/A', inline: true },
          { name: 'HTML File', value: record.htmlFilePath || 'None', inline: false },
          { name: 'TXT File', value: record.txtFilePath || 'None', inline: false },
        )
        .setFooter(FOOTER)
        .setTimestamp();

      if (record.aiSummary) {
        embed.addFields({ name: '🤖 AI Summary', value: record.aiSummary.slice(0, 1024), inline: false });
      }

      return message.reply({ embeds: [embed] });
    }

    // !set-transcript-channel #channel — admin only
    if (cmd === 'set-transcript-channel') {
      const admin = await checkAdmin(message);
      if (!admin) {
        return message.reply({ content: 'Admin only.' });
      }

      const mentioned = message.mentions.channels.first();
      if (!mentioned) {
        return message.reply({ content: 'Usage: `!set-transcript-channel #channel`' });
      }

      await prisma.transcriptSettings.upsert({
        where: { guildId: message.guild.id },
        update: { transcriptChannelId: mentioned.id },
        create: { guildId: message.guild.id, transcriptChannelId: mentioned.id },
      });

      return message.reply({ content: `✅ Transcript channel set to <#${mentioned.id}>.` });
    }

    // !transcripts @user — admin only, show last 5 transcripts
    if (cmd === 'transcripts') {
      const admin = await checkAdmin(message);
      if (!admin) {
        return message.reply({ content: 'Admin only.' });
      }

      const mentioned = message.mentions.users.first();
      if (!mentioned) {
        return message.reply({ content: 'Usage: `!transcripts @user`' });
      }

      const records = await getUserTranscripts(message.guild.id, mentioned.id, 5);

      if (!records.length) {
        return message.reply({ content: `No transcripts found for ${mentioned.username}.` });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`📋 Transcripts for ${mentioned.username}`)
        .setDescription(
          records.map((r, i) => {
            const date = r.closedAt ? new Date(r.closedAt).toLocaleDateString() : 'Unknown';
            return `**${i + 1}.** Ticket \`${r.ticketId.slice(-8)}\` — ${r.messageCount} msgs — ${date}`;
          }).join('\n')
        )
        .setFooter(FOOTER)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  },
};
