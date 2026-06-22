const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-ignore-bots-disable',
  description: 'Allow bots to receive the auto role when they join',
  mode: 'autorole-ignore-bots-disable',
});
