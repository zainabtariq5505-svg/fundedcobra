const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

async function getTranscriptSettings(guildId) {
  return prisma.transcriptSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTs(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function generateHTML(messages, ticket, closedByName) {
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : new Date();
  const openedAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
  const duration = openedAt ? Math.round((closedAt - openedAt) / 60000) : null;

  const messagesHtml = messages.map(msg => {
    const isBot = msg.author.bot;
    const avatarUrl = msg.author.displayAvatarURL({ size: 64, extension: 'png' });
    const attachmentsHtml = msg.attachments.size
      ? [...msg.attachments.values()].map(a =>
          `<a class="attachment" href="${escapeHtml(a.url)}" target="_blank">📎 ${escapeHtml(a.name)}</a>`
        ).join('')
      : '';
    const embedsHtml = msg.embeds.length
      ? msg.embeds.map(e => `<div class="embed-preview">${escapeHtml(e.title || '')}${e.description ? ': ' + escapeHtml(e.description.slice(0, 200)) : ''}</div>`).join('')
      : '';
    return `
      <div class="message${isBot ? ' bot-message' : ''}">
        <img class="avatar" src="${escapeHtml(avatarUrl)}" alt="" onerror="this.style.display='none'" />
        <div class="message-body">
          <div class="message-header">
            <span class="username">${escapeHtml(msg.author.username)}${isBot ? ' <span class="bot-tag">BOT</span>' : ''}</span>
            <span class="timestamp">${formatTs(msg.createdAt)}</span>
          </div>
          <div class="content">${escapeHtml(msg.content)}</div>
          ${attachmentsHtml}
          ${embedsHtml}
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket Transcript — ${escapeHtml(ticket.id.slice(-8))}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a2e; color: #e0e0f0; font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
    .header { background: #16213e; border-left: 4px solid #0099ff; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
    .header h1 { color: #0099ff; font-size: 20px; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 24px; }
    .meta-item { color: #a0a8c0; }
    .meta-item strong { color: #e0e0f0; }
    .messages { display: flex; flex-direction: column; gap: 2px; }
    .message { display: flex; gap: 12px; padding: 8px 12px; border-radius: 6px; }
    .message:hover { background: #1e2048; }
    .bot-message { background: #1a2040; }
    .bot-message:hover { background: #202455; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
    .message-body { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 2px; }
    .username { color: #5865f2; font-weight: 600; }
    .bot-tag { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 700; }
    .timestamp { color: #6a6e8a; font-size: 12px; }
    .content { word-break: break-word; white-space: pre-wrap; color: #d0d4ee; }
    .attachment { display: inline-block; margin-top: 4px; color: #0099ff; text-decoration: none; font-size: 13px; }
    .attachment:hover { text-decoration: underline; }
    .embed-preview { margin-top: 4px; background: #0d1224; border-left: 3px solid #5865f2; padding: 6px 10px; border-radius: 3px; color: #a0a8c0; font-size: 13px; }
    .footer { margin-top: 32px; text-align: center; color: #4a4e6a; font-size: 12px; padding: 16px; border-top: 1px solid #2a2e4a; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>📋 Ticket Transcript</h1>
      <div class="meta-grid">
        <div class="meta-item"><strong>Ticket ID:</strong> ${escapeHtml(ticket.id.slice(-8))}</div>
        <div class="meta-item"><strong>Category:</strong> ${escapeHtml(ticket.category)}</div>
        <div class="meta-item"><strong>User:</strong> ${escapeHtml(ticket.openerUsername)}</div>
        <div class="meta-item"><strong>Closed By:</strong> ${escapeHtml(closedByName || 'Unknown')}</div>
        ${openedAt ? `<div class="meta-item"><strong>Opened:</strong> ${formatTs(openedAt)}</div>` : ''}
        <div class="meta-item"><strong>Closed:</strong> ${formatTs(closedAt)}</div>
        ${duration !== null ? `<div class="meta-item"><strong>Duration:</strong> ${duration} minute${duration === 1 ? '' : 's'}</div>` : ''}
        <div class="meta-item"><strong>Messages:</strong> ${messages.length}</div>
      </div>
    </div>
    <div class="messages">
      ${messagesHtml}
    </div>
    <div class="footer">@fundedcobra &middot; Generated at ${formatTs(new Date())}</div>
  </div>
</body>
</html>`;
}

function generateTXT(messages, ticket, closedByName) {
  const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : new Date();
  const openedAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
  const duration = openedAt ? Math.round((closedAt - openedAt) / 60000) : null;

  const lines = [
    '====================================================',
    '  TICKET TRANSCRIPT — @fundedcobra',
    '====================================================',
    `Ticket ID  : ${ticket.id.slice(-8)}`,
    `Category   : ${ticket.category}`,
    `User       : ${ticket.openerUsername}`,
    `Closed By  : ${closedByName || 'Unknown'}`,
    openedAt ? `Opened     : ${formatTs(openedAt)}` : null,
    `Closed     : ${formatTs(closedAt)}`,
    duration !== null ? `Duration   : ${duration} minute${duration === 1 ? '' : 's'}` : null,
    `Messages   : ${messages.length}`,
    '====================================================',
    '',
    ...messages.map(msg => {
      const attachments = [...msg.attachments.values()].map(a => `  [Attachment: ${a.url}]`).join('\n');
      const content = msg.content || (msg.embeds.length ? '[Embed]' : '[No content]');
      return `[${formatTs(msg.createdAt)}] ${msg.author.username}${msg.author.bot ? ' [BOT]' : ''}: ${content}${attachments ? '\n' + attachments : ''}`;
    }),
    '',
    '====================================================',
    `Generated at ${formatTs(new Date())}`,
    '====================================================',
  ].filter(l => l !== null);

  return lines.join('\n');
}

async function generateTranscript(channel, ticket, closedById, client) {
  try {
    // 1. Fetch all messages (paginate up to 10 iterations, 100 each)
    const allMessages = [];
    let lastId = undefined;
    for (let i = 0; i < 10; i++) {
      const fetchOptions = { limit: 100 };
      if (lastId) fetchOptions.before = lastId;
      const batch = await channel.messages.fetch(fetchOptions).catch(() => null);
      if (!batch || batch.size === 0) break;
      allMessages.push(...batch.values());
      lastId = batch.last().id;
      if (batch.size < 100) break;
    }
    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // 2. Get settings
    const settings = await getTranscriptSettings(channel.guild.id);

    // 3. Resolve closer name
    let closedByName = 'Unknown';
    if (closedById) {
      const closer = await client.users.fetch(closedById).catch(() => null);
      if (closer) closedByName = closer.username;
    }

    // 4. Ensure transcripts dir exists
    const transcriptsDir = path.join(process.cwd(), 'transcripts');
    fs.mkdirSync(transcriptsDir, { recursive: true });

    // 5. Generate and save files
    const baseFilename = `ticket-${ticket.id.slice(-8)}-${Date.now()}`;
    let htmlPath = null;
    let txtPath = null;

    if (settings.saveHtml) {
      htmlPath = path.join(transcriptsDir, `${baseFilename}.html`);
      fs.writeFileSync(htmlPath, generateHTML(allMessages, ticket, closedByName), 'utf8');
    }

    if (settings.saveTxt) {
      txtPath = path.join(transcriptsDir, `${baseFilename}.txt`);
      fs.writeFileSync(txtPath, generateTXT(allMessages, ticket, closedByName), 'utf8');
    }

    // 6. AI summary
    let aiSummary = null;
    if (settings.aiSummaryEnabled) {
      try {
        const { generateSummary } = require('./openaiService');
        const last50 = allMessages.slice(-50);
        const context = last50.map(m => `${m.author.username}: ${m.content}`).filter(l => l.trim()).join('\n');
        if (context) {
          const summary = await generateSummary(context);
          if (summary) {
            aiSummary = summary.slice(0, 1000);
          }
        }
      } catch (err) {
        logger.error('AI summary failed:', err.message);
      }
    }

    // 7. Create transcript record
    const record = await prisma.ticketTranscript.create({
      data: {
        guildId: channel.guild.id,
        ticketId: ticket.id,
        channelId: channel.id,
        userId: ticket.openerId,
        username: ticket.openerUsername,
        closedBy: closedById,
        messageCount: allMessages.length,
        htmlFilePath: htmlPath,
        txtFilePath: txtPath,
        aiSummary,
        openedAt: ticket.createdAt || null,
        closedAt: ticket.closedAt || new Date(),
      },
    });

    // 8. Send to transcript channel if configured
    const { getTicketSettings } = require('./ticketService');
    const ticketSettings = await getTicketSettings(channel.guild.id);
    const logChannelId = settings.transcriptChannelId || ticketSettings.ticketLogChannelId;
    
    if (logChannelId) {
      await sendTranscriptLog(client, channel.guild.id, logChannelId, {
        ticket,
        record,
        closedByName,
        htmlPath,
        txtPath,
        aiSummary,
        messageCount: allMessages.length,
      });
    }

    // 9. DM opener if enabled and txt file exists
    if (txtPath) {
      try {
        const opener = await client.users.fetch(ticket.openerId).catch(() => null);
        if (opener) {
          const attachment = new AttachmentBuilder(txtPath, { name: path.basename(txtPath) });
          await opener.send({
            content: `Here is the transcript for your closed support ticket (ID: ${ticket.id.slice(-8)}).`,
            files: [attachment],
          }).catch(() => {});
        }
      } catch (err) {
        logger.error('Failed to DM transcript to user:', err.message);
      }
    }

    // 10. Return record
    return record;
  } catch (err) {
    logger.error('generateTranscript error:', err.message);
    return null;
  }
}

async function sendTranscriptLog(client, guildId, channelId, data) {
  const { ticket, record, closedByName, htmlPath, txtPath, aiSummary, messageCount } = data;
  try {
    const logChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!logChannel) return;

    const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : new Date();
    const openedAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
    const duration = openedAt ? Math.round((closedAt - openedAt) / 60000) : null;

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 Ticket Transcript')
      .addFields(
        { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
        { name: 'User', value: `<@${ticket.openerId}> (${ticket.openerUsername})`, inline: true },
        { name: 'Category', value: ticket.category, inline: true },
        { name: 'Closed By', value: closedByName || 'Unknown', inline: true },
        { name: 'Messages', value: String(messageCount), inline: true },
        { name: 'Duration', value: duration !== null ? `${duration} min` : 'N/A', inline: true },
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
      .setTimestamp();

    if (aiSummary) {
      embed.addFields({ name: '🤖 AI Summary', value: aiSummary.slice(0, 1024), inline: false });
    }

    const files = [];
    if (txtPath && fs.existsSync(txtPath)) {
      files.push(new AttachmentBuilder(txtPath, { name: path.basename(txtPath) }));
    }
    if (htmlPath && fs.existsSync(htmlPath)) {
      files.push(new AttachmentBuilder(htmlPath, { name: path.basename(htmlPath) }));
    }

    await logChannel.send({ embeds: [embed], files });
  } catch (err) {
    logger.error('sendTranscriptLog error:', err.message);
  }
}

async function generateManualTranscript(channel, ticket, requesterId, client) {
  return generateTranscript(channel, ticket, requesterId, client);
}

async function getUserTranscripts(guildId, userId, limit = 5) {
  return prisma.ticketTranscript.findMany({
    where: { guildId, userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { getTranscriptSettings, generateTranscript, generateManualTranscript, getUserTranscripts };
