const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-thumbnail',
  description: 'Set the welcome thumbnail URL',
  mode: 'set-welcome-thumbnail',
  configure(builder) {
    return builder.addStringOption((opt) =>
      opt.setName('url')
        .setDescription('Thumbnail image URL')
        .setRequired(true)
    );
  },
});