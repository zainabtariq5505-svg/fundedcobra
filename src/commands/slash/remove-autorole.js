const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'remove-autorole',
  description: 'Remove the configured auto role',
  mode: 'remove-autorole',
});
