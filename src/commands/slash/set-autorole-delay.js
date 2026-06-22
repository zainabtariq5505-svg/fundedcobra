const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'set-autorole-delay',
  description: 'Set a delay (in seconds) before the auto role is assigned after a member joins',
  mode: 'set-autorole-delay',
  configure: (b) =>
    b.addIntegerOption((o) =>
      o.setName('seconds')
        .setDescription('Delay in seconds (0 = instant)')
        .setMinValue(0)
        .setMaxValue(300)
        .setRequired(true)
    ),
});
