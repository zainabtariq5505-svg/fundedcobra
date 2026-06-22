// Load env first — throws if required vars are missing
require('./config/env');

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const env  = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./database/prisma');

// ── Singleton guard — kills any previous instance before starting ─────────────
const lockFile = path.join(__dirname, '..', '.bot.lock');
try {
  if (fs.existsSync(lockFile)) {
    const oldPid = parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10);
    if (oldPid && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 'SIGTERM');
        // Give it 500ms to die before we proceed
        const deadline = Date.now() + 500;
        while (Date.now() < deadline) { /* spin */ }
      } catch { /* already dead */ }
    }
    fs.unlinkSync(lockFile);
  }
  fs.writeFileSync(lockFile, String(process.pid));
} catch { /* non-fatal */ }
process.on('exit', () => { try { fs.unlinkSync(lockFile); } catch {} });

// ── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// ── Command Registries ────────────────────────────────────────────────────────
client.prefixCommands = new Collection();
client.slashCommands  = new Collection();

// ── Load Prefix Commands ─────────────────────────────────────────────────────
const prefixDir = path.join(__dirname, 'commands', 'prefix');
for (const file of fs.readdirSync(prefixDir).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(prefixDir, file));
  if (!command.name) {
    logger.warn(`Prefix command file ${file} is missing "name" export — skipping.`);
    continue;
  }
  // Register under all aliases
  const names = [command.name, ...(command.aliases || [])];
  for (const name of names) {
    client.prefixCommands.set(name.toLowerCase(), command);
    // Also register without hyphens for convenience
    client.prefixCommands.set(name.toLowerCase().replace(/-/g, ''), command);
  }
  logger.debug(`Loaded prefix command: ${command.name}`);
}

// ── Load Slash Commands ──────────────────────────────────────────────────────
const slashDir = path.join(__dirname, 'commands', 'slash');
for (const file of fs.readdirSync(slashDir).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(slashDir, file));
  if (!command.data?.name) {
    logger.warn(`Slash command file ${file} is missing "data.name" — skipping.`);
    continue;
  }
  client.slashCommands.set(command.data.name, command);
  logger.debug(`Loaded slash command: /${command.data.name}`);
}

// ── Load Events ──────────────────────────────────────────────────────────────
const eventsDir = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsDir, file));
  const handler = (...args) => event.execute(...args, client);
  if (event.once) {
    client.once(event.name, handler);
  } else {
    client.on(event.name, handler);
  }
  logger.debug(`Registered event: ${event.name}`);
}

// ── Unhandled rejection guard ────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Give logger time to flush before exit
  setTimeout(() => process.exit(1), 1000);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully...`);
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Login ─────────────────────────────────────────────────────────────────────
client.login(env.DISCORD_TOKEN).then(() => {
  logger.info('Discord login successful.');
}).catch(err => {
  logger.error('Failed to login to Discord:', err);
  process.exit(1);
});
