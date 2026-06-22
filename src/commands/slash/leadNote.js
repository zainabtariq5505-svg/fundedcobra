const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { addLeadNote, findLead } = require('../../services/leadService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leadnote')
    .setDescription('Add a note to a lead (Admin only)')
    .addStringOption(opt =>
      opt.setName('note')
         .setDescription('Note text')
         .setRequired(true)
         .setMaxLength(1000)
    )
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The Discord user')
         .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id')
         .setDescription('User ID')
         .setRequired(false)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const user    = interaction.options.getUser('user');
    const idInput = interaction.options.getString('id');
    const note    = interaction.options.getString('note');
    const query   = user?.id || idInput;

    if (!query) return interaction.editReply({ embeds: [embeds.error('Please provide a user or user ID.')] });

    const lead = await findLead(interaction.guild.id, query);
    if (!lead) return interaction.editReply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });

    await addLeadNote(lead.id, note, interaction.user.id);

    await auditLog.log({
      guildId: interaction.guild.id, adminId: interaction.user.id,
      action: 'ADD_LEAD_NOTE', target: lead.userId,
      details: note.slice(0, 200),
    });

    await interaction.editReply({
      embeds: [embeds.success(`Note added to **${lead.username}**:\n> ${note}`)],
    });
  },
};
