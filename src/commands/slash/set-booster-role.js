const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'set-booster-role',
  description: 'Set a reward role to assign when someone boosts the server',
  mode: 'set-booster-role',
  configure: (b) =>
    b.addRoleOption((o) =>
      o.setName('role')
        .setDescription('The role to award boosters')
        .setRequired(true)
    ),
});
