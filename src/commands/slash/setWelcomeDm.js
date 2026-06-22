const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-dm',
  description: 'Set the welcome DM message',
  mode: 'set-welcome-dm',
  configure(builder) {
    return builder.addStringOption((opt) =>
      opt.setName('message')
        .setDescription('DM message template')
        .setRequired(true)
    );
  },
});