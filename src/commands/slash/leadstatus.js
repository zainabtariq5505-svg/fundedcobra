const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { setLeadStatus, findLead } = require('../../services/leadService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leadstatus')
    .setDescription("Update a lead's status (Admin only)")
    .addStringOption(opt =>
      opt.setName('status')
         .setDescription('New status')
         .setRequired(true)
         .addChoices(
           { name: '🆕 New',     value: 'new'     },
           { name: '🟡 Warm',    value: 'warm'    },
           { name: '🔥 Hot',     value: 'hot'     },
           { name: '✅ Closed',  value: 'closed'  },
           { name: '⚫ Ignored', value: 'ignored' },
         )
    )
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The Discord user')
         .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id')
         .setDescription('User ID (if user not in server)')
         .setRequired(false)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const user    = interaction.options.getUser('user');
    const idInput = interaction.options.getString('id');
    const status  = interaction.options.getString('status');
    const query   = user?.id || idInput;

    if (!query) return interaction.editReply({ embeds: [embeds.error('Please provide a user or user ID.')] });

    const lead = await findLead(interaction.guild.id, query);
    if (!lead) return interaction.editReply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });

    await setLeadStatus(interaction.guild.id, lead.userId, status);

    await auditLog.log({
      guildId: interaction.guild.id, adminId: interaction.user.id,
      action: 'SET_LEAD_STATUS', target: lead.userId,
      details: `${lead.status} → ${status}`,
    });

    await interaction.editReply({
      embeds: [embeds.success(`Updated **${lead.username}** to status **${status}**.`)],
    });
  },
};
