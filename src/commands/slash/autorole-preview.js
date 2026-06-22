const { buildAutoRoleSlashCommand } = require('../shared/autorole');

module.exports = buildAutoRoleSlashCommand({
  name: 'autorole-preview',
  description: 'Preview what will happen when a new member joins',
  mode: 'autorole-preview',
});
