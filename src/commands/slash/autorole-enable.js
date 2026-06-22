const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-enable',
  description: 'Enable the Auto Role System',
  mode: 'autorole-enable',
});
