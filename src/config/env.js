require('dotenv').config();

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'OPENAI_API_KEY', 'DATABASE_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
}

module.exports = {
  DISCORD_TOKEN:            process.env.DISCORD_TOKEN,
  DISCORD_CLIENT_ID:        process.env.DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID:         process.env.DISCORD_GUILD_ID || null,
  OPENAI_API_KEY:           process.env.OPENAI_API_KEY,
  OPENAI_CHAT_MODEL:        process.env.OPENAI_CHAT_MODEL        || 'gpt-4o-mini',
  OPENAI_EMBEDDING_MODEL:   process.env.OPENAI_EMBEDDING_MODEL   || 'text-embedding-3-small',
  DATABASE_URL:             process.env.DATABASE_URL,
  BOT_PREFIX:               process.env.BOT_PREFIX               || '!',
  ADMIN_ROLE_ID:            process.env.ADMIN_ROLE_ID            || null,
  ALLOWED_DOMAINS:          (process.env.ALLOWED_DOMAINS || 'fundedcobra.com,www.fundedcobra.com').split(',').map(d => d.trim()),
  MAX_SCRAPE_PAGES:         parseInt(process.env.MAX_SCRAPE_PAGES    || '20', 10),
  RAG_TOP_K:                parseInt(process.env.RAG_TOP_K           || '5',  10),
  RAG_CONFIDENCE_THRESHOLD: parseFloat(process.env.RAG_CONFIDENCE_THRESHOLD || '0.75'),
  RAG_MIN_CONFIDENCE:       parseFloat(process.env.RAG_MIN_CONFIDENCE       || '0.40'),
  COOLDOWN_SECONDS:         parseInt(process.env.COOLDOWN_SECONDS   || '3',  10),
  NODE_ENV:                 process.env.NODE_ENV || 'development',
};
