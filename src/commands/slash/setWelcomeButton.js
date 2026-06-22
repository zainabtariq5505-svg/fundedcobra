const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-button',
  description: 'Set a welcome button',
  mode: 'set-welcome-button',
  configure(builder) {
    return builder
      .addIntegerOption((opt) =>
        opt.setName('slot')
          .setDescription('Button slot 1 to 5')
          .setMinValue(1)
          .setMaxValue(5)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('label')
          .setDescription('Button label')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('target')
          .setDescription('URL or channel mention')
          .setRequired(true)
      );
  },
});