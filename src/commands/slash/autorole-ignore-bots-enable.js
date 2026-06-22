const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-ignore-bots-enable',
  description: 'Prevent bots from receiving the auto role when they join',
  mode: 'autorole-ignore-bots-enable',
});
