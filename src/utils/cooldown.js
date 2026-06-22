const env = require('../config/env');

// userId → Map<commandName, lastUsedTimestamp>
const cooldowns = new Map();

/**
 * Checks if a user is on cooldown for a command.
 * @param {string} userId
 * @param {string} commandName
 * @param {number} [seconds] - Override default cooldown
 * @returns {{ onCooldown: boolean, remaining: number }}
 */
function checkCooldown(userId, commandName, seconds = env.COOLDOWN_SECONDS) {
  if (!cooldowns.has(userId)) cooldowns.set(userId, new Map());
  const userCooldowns = cooldowns.get(userId);

  const lastUsed = userCooldowns.get(commandName) || 0;
  const now = Date.now();
  const elapsed = (now - lastUsed) / 1000;

  if (elapsed < seconds) {
    return { onCooldown: true, remaining: Math.ceil(seconds - elapsed) };
  }

  userCooldowns.set(commandName, now);
  return { onCooldown: false, remaining: 0 };
}

/** Manually set cooldown (e.g., for API-heavy commands) */
function setCooldown(userId, commandName, seconds = env.COOLDOWN_SECONDS) {
  if (!cooldowns.has(userId)) cooldowns.set(userId, new Map());
  cooldowns.get(userId).set(commandName, Date.now() + (seconds * 1000) - (env.COOLDOWN_SECONDS * 1000));
}

/** Clears all cooldowns (used on reload) */
function clearAll() {
  cooldowns.clear();
}

module.exports = { checkCooldown, setCooldown, clearAll };
