const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'set-booster-thumbnail',
  description: 'Set the thumbnail image/GIF shown in booster appreciation embeds',
  mode: 'set-booster-thumbnail',
  configure: (b) =>
    b.addStringOption((o) =>
      o.setName('url')
        .setDescription('Direct image or GIF URL (https://...)')
        .setRequired(true)
    ),
});
