const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'set-autorole',
  description: 'Set the role to automatically assign to new members',
  mode: 'set-autorole',
  configure: (b) =>
    b.addRoleOption((o) =>
      o.setName('role')
        .setDescription('The role to assign to new members')
        .setRequired(true)
    ),
});
