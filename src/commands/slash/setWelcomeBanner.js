const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-banner',
  description: 'Set the welcome banner URL',
  mode: 'set-welcome-banner',
  configure(builder) {
    return builder.addStringOption((opt) =>
      opt.setName('url')
        .setDescription('Banner image URL')
        .setRequired(true)
    );
  },
});