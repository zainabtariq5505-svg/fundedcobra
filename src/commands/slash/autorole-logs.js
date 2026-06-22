const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-logs',
  description: 'View recent auto role assignment logs',
  mode: 'autorole-logs',
});
