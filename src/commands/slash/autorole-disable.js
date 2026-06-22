const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-disable',
  description: 'Disable the Auto Role System',
  mode: 'autorole-disable',
});
