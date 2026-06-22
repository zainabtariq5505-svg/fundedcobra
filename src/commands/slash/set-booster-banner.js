const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'set-booster-banner',
  description: 'Set the banner image shown in booster appreciation embeds',
  mode: 'set-booster-banner',
  configure: (b) =>
    b.addStringOption((o) =>
      o.setName('url')
        .setDescription('Direct image URL (https://...)')
        .setRequired(true)
    ),
});
