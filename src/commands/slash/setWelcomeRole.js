const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'set-welcome-role',
  description: 'Set the welcome role',
  mode: 'set-welcome-role',
  configure(builder) {
    return builder.addRoleOption((opt) =>
      opt.setName('role')
        .setDescription('Role to assign on join')
        .setRequired(true)
    );
  },
});