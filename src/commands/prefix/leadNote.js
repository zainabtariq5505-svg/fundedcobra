const { checkAdminMessage } = require('../../utils/adminCheck');
const { addLeadNote, findLead } = require('../../services/leadService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'leadnote',
  aliases: ['lead-note'],
  description: 'Add a note to a lead',
  usage: '!leadnote <@user|id> <note text>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const [query, ...noteParts] = args;
    const note = noteParts.join(' ').trim();

    if (!query || !note) {
      return message.reply({ embeds: [embeds.error('**Usage:** `!leadnote <@user|id> <note text>`')] });
    }

    const lead = await findLead(message.guild.id, query);
    if (!lead) return message.reply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });

    await addLeadNote(lead.id, note, message.author.id);

    await auditLog.log({
      guildId: message.guild.id, adminId: message.author.id,
      action: 'ADD_LEAD_NOTE', target: lead.userId,
      details: note.slice(0, 200),
    });

    await message.reply({
      embeds: [embeds.success(`Note added to **${lead.username}**:\n> ${note}`)],
    });
  },
};
