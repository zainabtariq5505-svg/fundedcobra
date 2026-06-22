const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'remove-welcome-button',
  description: 'Remove a welcome button',
  mode: 'remove-welcome-button',
  configure(builder) {
    return builder.addIntegerOption((opt) =>
      opt.setName('slot')
        .setDescription('Button slot 1 to 5')
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(true)
    );
  },
});