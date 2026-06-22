const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-status',
  description: 'View the current Auto Role System configuration and status',
  mode: 'autorole-status',
});
