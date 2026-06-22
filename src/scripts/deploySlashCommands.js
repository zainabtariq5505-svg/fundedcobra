/**
 * Deploys slash commands to Discord.
 * Run: npm run deploy:commands
 *
 * - If DISCORD_GUILD_ID is set: deploys to that guild instantly (dev mode).
 * - If not set: deploys globally (takes up to 1 hour to propagate).
 */

require('../config/env'); // Load and validate env
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const env  = require('../config/env');

const commands = [];
const slashDir = path.join(__dirname, '..', 'commands', 'slash');

for (const file of fs.readdirSync(slashDir).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(slashDir, file));
  if (command.data?.toJSON) {
    commands.push(command.data.toJSON());
    console.log(`  ✓ Loaded: /${command.data.name}`);
  }
}

const rest = new REST().setToken(env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\nDeploying ${commands.length} slash command(s)...`);

    let data;
    if (env.DISCORD_GUILD_ID) {
      // Guild-specific (instant)
      data = await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log(`\n✅ Deployed ${data.length} command(s) to guild ${env.DISCORD_GUILD_ID} (instant).`);
    } else {
      // Global (1 hour propagation)
      data = await rest.put(
        Routes.applicationCommands(env.DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log(`\n✅ Deployed ${data.length} command(s) globally (may take up to 1 hour).`);
    }
  } catch (err) {
    console.error('❌ Failed to deploy commands:', err);
    process.exit(1);
  }
})();
