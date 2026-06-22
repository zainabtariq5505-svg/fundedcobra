const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');

function createConfigCommand(name, description, fieldName, type) {
  const cmd = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions('0'); // Admin only
    
  if (type === 'channel') {
    cmd.addChannelOption(opt => opt.setName('channel').setDescription('The channel').setRequired(true));
  } else if (type === 'role') {
    cmd.addRoleOption(opt => opt.setName('role').setDescription('The role').setRequired(true));
  } else if (type === 'boolean') {
    cmd.addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true));
  } else if (type === 'category') {
    cmd.addChannelOption(opt => opt.setName('category').setDescription('The category').setRequired(true));
  }
  
  return {
    data: cmd,
    async execute(interaction) {
      const value = type === 'channel' ? interaction.options.getChannel('channel').id :
                    type === 'role' ? interaction.options.getRole('role').id :
                    type === 'boolean' ? interaction.options.getBoolean('enabled') :
                    type === 'category' ? interaction.options.getChannel('category').id : null;
                    
      await prisma.ticketSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { [fieldName]: value },
        create: { guildId: interaction.guild.id, [fieldName]: value }
      });
      return interaction.reply({ content: '? Settings updated.', ephemeral: true });
    }
  };
}

const fs = require('fs');

fs.writeFileSync('src/commands/slash/set-ticket-category.js', 'module.exports = ' + createConfigCommand.toString() + ';\nmodule.exports = createConfigCommand(\"set-ticket-category\", \"Set ticket category\", \"ticketCategoryId\", \"category\");');
fs.writeFileSync('src/commands/slash/set-ticket-log.js', 'module.exports = ' + createConfigCommand.toString() + ';\nmodule.exports = createConfigCommand(\"set-ticket-log\", \"Set ticket log channel\", \"ticketLogChannelId\", \"channel\");');
fs.writeFileSync('src/commands/slash/set-ticket-transcript-channel.js', 'module.exports = ' + createConfigCommand.toString() + ';\nmodule.exports = createConfigCommand(\"set-ticket-transcript-channel\", \"Set ticket transcript channel\", \"transcriptChannelId\", \"channel\");');
fs.writeFileSync('src/commands/slash/set-support-role.js', 'module.exports = ' + createConfigCommand.toString() + ';\nmodule.exports = createConfigCommand(\"set-support-role\", \"Set support role\", \"supportRoleId\", \"role\");');
fs.writeFileSync('src/commands/slash/set-ticket-ai-mode.js', 'module.exports = ' + createConfigCommand.toString() + ';\nmodule.exports = createConfigCommand(\"set-ticket-ai-mode\", \"Set default ticket AI mode\", \"aiEnabledByDefault\", \"boolean\");');
