const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER } = require('../utils/embeds');
const { getGuildSettings } = require('./settingsService');

const HANDOFF_KEYWORDS = [
  'refund', 'payout issue', 'payment failed', 'payment issue', 'account disabled', 'account breach',
  'complaint', 'legal exception', 'policy exception', 'legal', 'fraud', 'scam', 'chargeback',
];

const SALES_OBJECTION_KEYWORDS = [
  'is this legit', 'is payout real', 'can i trust you', 'any proof', 'why fundedcobra',
  'proof of payout', 'reviews', 'testimonials', 'is this a scam', 'legit?', 'real?',
];

function categorizeQuestion(question, intent = 'general') {
  const text = (question || '').toLowerCase();
  if (text.includes('refund')) return 'Refund Request';
  if (text.includes('payout') || text.includes('withdraw')) return 'Payout Issue';
  if (text.includes('payment') || text.includes('card') || text.includes('checkout')) return 'Payment Issue';
  if (text.includes('account disabled') || text.includes('breach') || text.includes('login')) return 'Account Issue';
  if (text.includes('rule')) return 'Rules Question';
  if (intent === 'pricing' || text.includes('price') || text.includes('coupon') || text.includes('buy')) return 'General Support';
  return 'General Support';
}

function shouldEscalateToHuman(question, intent = 'general', confidence = 0) {
  const text = (question || '').toLowerCase();
  const handoff = HANDOFF_KEYWORDS.some(keyword => text.includes(keyword));
  const objection = SALES_OBJECTION_KEYWORDS.some(keyword => text.includes(keyword));
  const lowConfidence = confidence > 0 && confidence < 0.4;
  return {
    escalate: handoff || lowConfidence,
    objection,
    lowConfidence,
    category: categorizeQuestion(question, intent),
    reason: handoff ? 'support/escalation topic' : lowConfidence ? 'low-confidence answer' : null,
  };
}

function buildHandoffEmbed({ question, reason, category, username }) {
  return new EmbedBuilder()
    .setColor(COLORS.ORANGE)
    .setTitle('Support Handoff')
    .addFields(
      { name: 'User', value: username || 'Unknown', inline: true },
      { name: 'Category', value: category, inline: true },
      { name: 'Reason', value: reason || 'Escalation triggered', inline: false },
      { name: 'Question', value: question.slice(0, 1000), inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

async function notifySupportChannel(client, guildId, payload) {
  const settings = await getGuildSettings(guildId);
  if (!settings.supportChannelId) return false;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(settings.supportChannelId) || await guild?.channels.fetch(settings.supportChannelId).catch(() => null);
  if (!channel) return false;

  await channel.send({
    content: settings.supportRoleId ? `<@&${settings.supportRoleId}>` : null,
    embeds: [buildHandoffEmbed(payload)],
  }).catch(() => {});
  return true;
}

async function sendHotLeadAlert(client, guildId, lead, extra = {}) {
  const settings = await getGuildSettings(guildId);
  if (!settings.leadAlertChannelId) return false;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(settings.leadAlertChannelId) || await guild?.channels.fetch(settings.leadAlertChannelId).catch(() => null);
  if (!channel) return false;

  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('Hot Lead Alert')
    .addFields(
      { name: 'User', value: `${lead.username} (${lead.userId})`, inline: false },
      { name: 'Score', value: `${lead.score}/100`, inline: true },
      { name: 'Questions Asked', value: `${extra.questionCount24h ?? 0}`, inline: true },
      { name: 'Suggested Next Action', value: extra.suggestedAction || 'Reach out with a tailored offer and answer their buying questions.', inline: false },
      { name: 'Timestamp', value: new Date().toLocaleString(), inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
  return true;
}

async function applyBehaviorRoles(client, guildId, userId, roleNames = []) {
  if (!client || !roleNames.length) return false;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;

  const roleIds = roleNames
    .map(roleName => guild.roles.cache.find(role => role.name === roleName)?.id)
    .filter(Boolean);

  if (!roleIds.length) return false;

  await member.roles.add(roleIds).catch(() => {});
  return true;
}

module.exports = {
  categorizeQuestion,
  shouldEscalateToHuman,
  notifySupportChannel,
  sendHotLeadAlert,
  applyBehaviorRoles,
};
