# FundedCobra Discord Bot

Premium AI-powered support bot for FundedCobra — a forex prop trading firm. Answers trader questions using a RAG (Retrieval-Augmented Generation) knowledge base built from official FundedCobra rules, FAQs, and website content.

---

## Features

- **AI-Powered Q&A** — Answers questions using official FundedCobra rules first, with clear confidence indicators
- **RAG Knowledge Base** — Semantic search over imported rules using OpenAI embeddings
- **Lead Management** — Automatically identifies and tracks potential customers
- **Anti-Hallucination** — Clearly labels unofficial guidance vs official rules
- **Prompt Injection Protection** — Guards against manipulation attempts
- **Both Prefix & Slash Commands** — Works with `!` prefix and `/` slash commands
- **Admin Knowledge Base Management** — Import URLs, text, JSONs, crawl website
- **CSV Export** — Export leads for CRM/email outreach
- **Role-Based Access** — Admin-only commands protected by permissions
- **Cooldowns & Rate Limiting** — Prevents spam and OpenAI overuse
- **Audit Logging** — Tracks all admin actions
- **Premium Welcome System** — Branded join messages, welcome DMs, role assignment, and configurable buttons
- **SQLite Default** — Easy switch to PostgreSQL via Prisma

---

## Requirements

- Node.js 18+
- npm
- A Discord bot application
- An OpenAI API key

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd fundedcobra-discord-bot

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Create the database
npm run db:migrate

# 5. Generate Prisma client
npm run db:generate

# 6. Seed the initial knowledge base
node src/scripts/seed.js

# 7. Deploy slash commands to Discord
npm run deploy:commands

# 8. Start the bot
npm start
```

---

## .env Setup

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Your application's client ID |
| `DISCORD_GUILD_ID` | (Optional) Server ID for instant slash command deployment in dev |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `OPENAI_CHAT_MODEL` | Default: `gpt-4o-mini` (or `gpt-4o` for best quality) |
| `OPENAI_EMBEDDING_MODEL` | Default: `text-embedding-3-small` |
| `DATABASE_URL` | SQLite: `file:./data/fundedcobra.db` · MongoDB: `mongodb+srv://...` · PostgreSQL: `postgresql://...` |
| `BOT_PREFIX` | Default: `!` |
| `ADMIN_ROLE_ID` | Optional Discord role ID for admin access |
| `ALLOWED_DOMAINS` | Comma-separated domains allowed for URL imports |
| `MAX_SCRAPE_PAGES` | Max pages to crawl per sync operation |
| `RAG_TOP_K` | Top K chunks to retrieve per query (default: 5) |
| `RAG_CONFIDENCE_THRESHOLD` | High-confidence threshold (default: 0.75) |
| `RAG_MIN_CONFIDENCE` | Min threshold to show context (default: 0.40) |

---

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a New Application → "FundedCobra Bot"
3. Go to **Bot** tab → Create a bot → Copy the token to `DISCORD_TOKEN`
4. Copy the Application ID to `DISCORD_CLIENT_ID`
5. Under **Bot** tab, enable:
   - **MESSAGE CONTENT INTENT** (required for prefix commands)
   - **SERVER MEMBERS INTENT**
   - **PRESENCE INTENT**
6. Go to **OAuth2** → **URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`, `Embed Links`, `Attach Files`
7. Use the generated URL to invite the bot to your server

---

## Required Discord Intents

In `src/index.js`, the bot uses:

```
GatewayIntentBits.Guilds
GatewayIntentBits.GuildMessages
GatewayIntentBits.MessageContent   ← requires privileged intent
GatewayIntentBits.GuildMembers     ← requires privileged intent
```

Both **Message Content** and **Server Members** must be enabled in the Discord Developer Portal.

---

## Database Setup

The bot supports **SQLite** (default), **MongoDB**, and **PostgreSQL** — all via Prisma ORM. The application code is identical for all three; only the schema file and `DATABASE_URL` change.

### SQLite (default — no server needed)

```bash
npm run db:migrate        # creates prisma/data/fundedcobra.db
npm run db:studio         # open Prisma Studio
```

---

### MongoDB

Supports **MongoDB Atlas** (cloud) or a local MongoDB instance.

#### 1. Switch the schema
```bash
npm run db:use-mongo
```
This copies `prisma/schema.mongodb.prisma` → `prisma/schema.prisma` and backs up the current one.

#### 2. Set your connection string in `.env`

**MongoDB Atlas (recommended for production):**
```
DATABASE_URL=mongodb+srv://username:password@cluster0.abcde.mongodb.net/fundedcobra?retryWrites=true&w=majority
```

**Local MongoDB:**
```
DATABASE_URL=mongodb://localhost:27017/fundedcobra
```

#### 3. Push the schema and generate the client
```bash
npm run db:generate       # regenerate Prisma client for MongoDB
npm run db:push           # apply schema to MongoDB (no migration files)
```

#### 4. Seed the knowledge base
```bash
node src/scripts/seed.js
```

#### MongoDB Atlas — quick setup
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create a free cluster
2. **Database Access** → Add a user with Read/Write permission
3. **Network Access** → Add your IP (or `0.0.0.0/0` for open access)
4. **Connect** → "Connect your application" → copy the connection string
5. Replace `<password>` with your user's password and `myFirstDatabase` with `fundedcobra`

#### Switch back to SQLite
```bash
npm run db:use-sqlite
npm run db:generate
npm run db:migrate
```

---

### Switch to PostgreSQL

1. Change `DATABASE_URL` in `.env` to your PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/fundedcobra
   ```
2. Change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`
3. Run `npm run db:migrate` again

---

## Deploying Slash Commands

```bash
# Deploy to a specific guild (instant, for testing)
# Set DISCORD_GUILD_ID in .env first
npm run deploy:commands

# Deploy globally (takes up to 1 hour)
# Remove DISCORD_GUILD_ID from .env
npm run deploy:commands
```

---

## Running the Bot

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

---

## Importing Rules

### Via Slash Command (admin)
```
/import-url url:https://www.fundedcobra.com/rules
/import-text title:Refund Policy content:Our refund policy states...
/sync-website   ← Crawls the full FundedCobra website
```

### Via Prefix Command (admin)
```
!import-url https://www.fundedcobra.com/rules
!import-text Refund Policy | Our refund policy states...
!sync-website
```

### Via Seed Script (one-time setup)
```bash
node src/scripts/seed.js
```
Seeds all official rules, FAQs, challenge details, and pricing from the FundedCobra website content.

---

## Command Reference

### Public Commands (Everyone)

| Command | Description |
|---------|-------------|
| `!ask <question>` / `/ask` | Ask the AI a question |
| `!rules <keyword>` / `/rules` | Search official trading rules |
| `!help` / `/help` | Show command list |
| `!ping` / `/ping` | Check bot latency |

### Admin Commands

| Command | Description |
|---------|-------------|
| `!import-url <url>` | Import a webpage |
| `!import-text <title> \| <text>` | Import manual text |
| `!sync-website` | Crawl & sync full website |
| `!sources` | List all knowledge sources |
| `!source <id>` | View source details |
| `!delete-source <id>` | Delete a source |
| `!leads [status]` | View leads |
| `!lead <@user\|id>` | View lead profile |
| `!leadsearch <keyword>` | Search leads |
| `!leadstatus <@user\|id> <status>` | Update lead status |
| `!leadnote <@user\|id> <note>` | Add lead note |
| `!export-leads` | Export leads CSV |
| `!stats` | View statistics |
| `!setprefix <prefix>` | Change prefix |
| `!reload` | Reload bot presence |
| `!welcome` | Show welcome system status |
| `!welcome-enable` / `!welcome-disable` | Toggle welcome messages |
| `!welcome-preview` | Preview the welcome embed |
| `!set-welcome-channel #channel` | Set the welcome channel |
| `!set-welcome-message <message>` | Set the welcome text template |
| `!set-welcome-banner <url>` | Set the banner image |
| `!set-welcome-thumbnail <url>` | Set the thumbnail image |
| `!set-welcome-role @role` | Assign a default role on join |
| `!remove-welcome-role` | Remove the default welcome role |
| `!welcome-dm-enable` / `!welcome-dm-disable` | Toggle welcome DMs |
| `!set-welcome-dm <message>` | Set the welcome DM template |
| `!set-welcome-button <slot> <label> <url_or_channel>` | Add a welcome button |
| `!remove-welcome-button <slot>` | Remove a welcome button |

### Lead Statuses
`new` → `warm` → `hot` → `closed` / `ignored`

---

## Premium Welcome System

The welcome system sends a branded FundedCobra welcome embed whenever a new member joins.

### What it supports

- Custom welcome channel
- Banner image and thumbnail image
- Custom welcome message templates
- Custom Discord emojis inside messages
- Auto role assignment on join
- Optional welcome DMs
- Optional button row with up to 5 links
- Welcome event logging in the database

### Setup

1. Set the welcome channel:
```bash
!set-welcome-channel #welcome
/set-welcome-channel channel:#welcome
```

2. Set the banner and thumbnail:
```bash
!set-welcome-banner https://your-image-link.com/banner.png
!set-welcome-thumbnail https://your-logo-link.com/logo.png
```

3. Customize the welcome message:
```bash
!set-welcome-message Welcome {user} to {server}! <:cobra:123456789> Start by reading {rulesChannel}.
```

4. Enable the default role:
```bash
!set-welcome-role @Trader
```

5. Enable welcome DMs:
```bash
!welcome-dm-enable
!set-welcome-dm Welcome {user}! Check the rules and ask support if you need help.
```

6. Turn the system on and preview it:
```bash
!welcome-enable
!welcome-preview
```

### Variables

Use these placeholders inside welcome messages:

- `{user}` — member mention
- `{username}` — member username
- `{server}` — server name
- `{memberCount}` — current server member count
- `{rulesChannel}` — configured rules channel mention or fallback text
- `{supportChannel}` — configured support channel mention or fallback text
- `{pricingChannel}` — configured pricing channel mention or fallback text

### Buttons

Use button slots to add useful links below the welcome embed:

```bash
!set-welcome-button 1 View Rules https://discord.com/channels/...
!set-welcome-button 2 Ask AI Bot https://discord.com/channels/...
!set-welcome-button 3 Pricing https://www.fundedcobra.com/pricing
!remove-welcome-button 3
```

Accepted targets include direct URLs, channel mentions, or channel IDs.

### Notes

- If the banner or thumbnail URL is invalid, the bot sends the embed without that image.
- If the welcome channel is missing, the bot logs the issue and does not crash.
- If the DM fails because the user has DMs closed, the bot ignores the error safely.
- Admin-only settings are protected by Administrator permission or the configured admin role.

---

## Admin Permissions

A user is treated as admin if they have:
- **Administrator** permission in the server, OR
- The role configured as `ADMIN_ROLE_ID` in `.env`, OR
- The role configured per-guild via `!setprefix` flow

---

## AI Confidence System

| Level | Threshold | Meaning |
|-------|-----------|---------|
| 🟢 High | ≥ 75% | Answer from official rules — highly accurate |
| 🟡 Medium | 40–74% | Partial match — answer with caution, verify with team |
| 🔴 Low | < 40% | Not found in official rules — non-official guidance |

---

## Troubleshooting

**Bot doesn't respond to prefix commands**
- Ensure `MESSAGE CONTENT INTENT` is enabled in Discord Developer Portal
- Verify the prefix is correct (default: `!`)

**Slash commands not showing**
- Run `npm run deploy:commands`
- If using guild deployment, ensure `DISCORD_GUILD_ID` is set correctly
- Global deployment takes up to 1 hour

**"Missing required environment variable" error**
- Ensure `.env` exists and all required variables are set

**Low AI answer quality**
- Run `node src/scripts/seed.js` to populate the knowledge base
- Use `!sync-website` or `/sync-website` to import website content
- Use `gpt-4o` instead of `gpt-4o-mini` for higher quality

**OpenAI rate limit errors**
- The bot has a cooldown system — default 8 seconds for AI commands
- Increase `COOLDOWN_SECONDS` in `.env` if needed

**Database errors**
- Run `npm run db:migrate` to create/update tables
- Run `npm run db:generate` to regenerate the Prisma client

---

## Project Structure

```
fundedcobra-discord-bot/
├── .env.example              # Environment variable template
├── package.json
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── index.js              # Main bot entry point
│   ├── config/
│   │   ├── env.js            # Environment variable loader
│   │   └── permissions.js    # Admin permission checks
│   ├── database/
│   │   └── prisma.js         # Prisma client singleton
│   ├── commands/
│   │   ├── prefix/           # !prefix commands
│   │   └── slash/            # /slash commands
│   ├── events/
│   │   ├── ready.js
│   │   ├── messageCreate.js  # Prefix command handler
│   │   ├── interactionCreate.js # Slash command handler
│   │   └── error.js
│   ├── services/
│   │   ├── openaiService.js  # OpenAI API wrapper
│   │   ├── embeddingService.js # Embedding & cosine similarity
│   │   ├── ragService.js     # Full RAG pipeline
│   │   ├── ruleImportService.js # Knowledge base import
│   │   ├── websiteScraperService.js # Web scraper
│   │   ├── leadService.js    # Lead management
│   │   ├── intentService.js  # Intent detection
│   │   ├── exportService.js  # CSV export
│   │   └── auditLogService.js
│   ├── utils/
│   │   ├── embeds.js         # Discord embed builders
│   │   ├── chunkText.js      # Text chunking
│   │   ├── sanitize.js       # Input sanitization
│   │   ├── cooldown.js       # Rate limiting
│   │   ├── adminCheck.js     # Admin auth helpers
│   │   ├── logger.js         # Winston logger
│   │   └── formatDate.js
│   └── scripts/
│       ├── deploySlashCommands.js
│       └── seed.js           # Initial knowledge base seed
└── logs/                     # Auto-created log files
```

---

## Security Notes

- Never commit `.env` to version control
- API keys are loaded from environment variables only
- All admin commands require Administrator permission or configured role
- User input is sanitized and checked for prompt injection
- The bot never reveals API keys, system prompts, or internal data
- Rate limiting prevents spam and API abuse
