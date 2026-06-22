const { EmbedBuilder } = require('discord.js');

// ── Brand colours ──────────────────────────────────────────────────────────
const COLORS = {
  PRIMARY:  0x1A1A2E,   // dark navy
  PURPLE:   0x7B00FF,
  GOLD:     0xFFD700,
  GREEN:    0x00FF88,
  RED:      0xFF4444,
  ORANGE:   0xFF8C00,
  GREY:     0x2C2F33,
};

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };

// ── Confidence helpers ──────────────────────────────────────────────────────
function confidenceLabel(score) {
  if (score >= 0.75) return { label: 'High', emoji: '🟢', color: COLORS.GREEN };
  if (score >= 0.40) return { label: 'Medium', emoji: '🟡', color: COLORS.GOLD };
  return { label: 'Low', emoji: '🔴', color: COLORS.ORANGE };
}

// ── Core builder ────────────────────────────────────────────────────────────
function base(color = COLORS.PRIMARY) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter(FOOTER)
    .setTimestamp();
}

// ── Public builders ─────────────────────────────────────────────────────────

/** Official rule answer — sourced from knowledge base */
function ruleAnswer({ question, answer, sourceName, sourceUrl, confidence, intent }) {
  const conf = confidenceLabel(confidence ?? 1);
  const embed = base(conf.color)
    .setTitle('FundedCobra Support')
    .setDescription(truncate(answer, 4000))
    .addFields(
      { name: 'Confidence', value: `${conf.emoji} ${conf.label}`, inline: true },
      { name: 'Intent',     value: intent || 'General',           inline: true },
    );

  if (sourceName) {
    const src = sourceUrl ? `[${sourceName}](${sourceUrl})` : sourceName;
    embed.addFields({ name: 'Source', value: `Official FundedCobra Rules — ${src}`, inline: false });
  }

  return embed;
}

/** Non-official / low-confidence guidance */
function uncertainAnswer({ answer, intent }) {
  return base(COLORS.ORANGE)
    .setTitle('FundedCobra Support')
    .setDescription(truncate(answer, 4000))
    .addFields(
      { name: 'Confidence', value: '🔴 Low — Not found in official rules', inline: true },
      { name: 'Intent',     value: intent || 'General', inline: true },
      {
        name: 'Note',
        value: '_This guidance is based on general context. Please confirm with the FundedCobra team for final clarification._',
        inline: false,
      },
    );
}

/** Error embed */
function error(message, title = 'Error') {
  return base(COLORS.RED)
    .setTitle(`❌ ${title}`)
    .setDescription(message);
}

/** Success embed */
function success(message, title = 'Success') {
  return base(COLORS.GREEN)
    .setTitle(`✅ ${title}`)
    .setDescription(message);
}

/** Info / neutral embed */
function info(message, title = 'FundedCobra Bot') {
  return base(COLORS.PRIMARY)
    .setTitle(title)
    .setDescription(message);
}

/** Ping/stats embed */
function ping(latency, apiLatency) {
  return base(COLORS.PURPLE)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: 'Bot Latency',     value: `${latency}ms`,    inline: true },
      { name: 'Discord API',     value: `${apiLatency}ms`, inline: true },
      { name: 'Status',          value: '🟢 Online',       inline: true },
    );
}

/** Splits a long text into multiple embed descriptions safely */
function splitLongAnswer(answer, maxLength = 4000) {
  const chunks = [];
  let remaining = answer;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }
  return chunks;
}

function truncate(str, max = 4000) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

module.exports = { base, ruleAnswer, uncertainAnswer, error, success, info, ping, COLORS, FOOTER, confidenceLabel, splitLongAnswer, truncate };
