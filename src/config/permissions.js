const { PermissionFlagsBits } = require('discord.js');
const env = require('./env');

/**
 * Returns true if the member is a bot admin (ADMINISTRATOR perm or admin role).
 * @param {import('discord.js').GuildMember} member
 * @param {string|null} [configuredAdminRoleId]
 */
function isAdmin(member, configuredAdminRoleId = null) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const roleId = configuredAdminRoleId || env.ADMIN_ROLE_ID;
  if (roleId && member.roles.cache.has(roleId)) return true;
  return false;
}

/**
 * Returns true if the member has support access.
 * @param {import('discord.js').GuildMember} member
 * @param {string|null} [configuredSupportRoleId]
 */
function isSupport(member, configuredSupportRoleId = null) {
  if (!member) return false;
  if (isAdmin(member)) return true; // Admins are always support
  if (configuredSupportRoleId && member.roles.cache.has(configuredSupportRoleId)) return true;
  return false;
}

/** Commands that require admin access */
const ADMIN_COMMANDS = new Set([
  'import-url', 'importurl', 'importUrl',
  'import-text', 'importtext', 'importText',
  'sync-website', 'syncwebsite', 'syncWebsite',
  'sources',
  'source',
  'delete-source', 'deletesource', 'deleteSource',
  'leads',
  'lead',
  'leadsearch', 'lead-search',
  'leadstatus', 'lead-status',
  'leadnote', 'lead-note',
  'export-leads', 'exportleads', 'exportLeads',
  'stats',
  'setprefix', 'set-prefix',
  'set-offer', 'set-coupon', 'set-pricing', 'set-lead-channel', 'set-ticket-category',
  'set-admin-role', 'set-support-role', 'enable-dm-followup', 'disable-dm-followup',
  'unanswered', 'answer-unanswered', 'delete-unanswered',
  'rule-history', 'compare-rule', 'comparerule',
  'reload',
  // Module 1: Moderation (moderator-or-admin level via isModerator)
  'warn', 'warnings', 'clearwarns',
  'mute', 'timeout', 'unmute',
  'kick', 'ban', 'unban', 'softban',
  'purge', 'clear',
  'lock', 'unlock', 'slowmode',
  'modlogs', 'case', 'deletecase',
  'watch', 'unwatch', 'watchlist',
  'blacklist', 'unblacklist',
  'set-modlog', 'setmodlog',
  // Module 2: Help menu settings
  'set-help-banner', 'sethelpbanner',
  'set-help-thumbnail', 'sethelpthumbnail',
  // Module 3: Social notifier (admin only)
  'social-add', 'social-remove', 'social-list', 'social-channel', 'social-ping',
  'social-message', 'social-test', 'social-enable', 'social-disable',
  'social-check-now', 'social-checknow', 'social-logs', 'social-reactions',
  'set-social-banner', 'set-social-thumbnail', 'social-set-token',
  // Module 4: Invite Tracker (admin only for management)
  'reset-invites', 'resetinvites',
  'set-invite-log', 'setinvitelog',
  'invite-bonus-enable', 'invitebonusenable',
  'invite-bonus-disable', 'invitebonusdisable',
  'set-min-invite-stay', 'setmininvitestay',
  'set-min-account-age', 'setminaccountage',
  // Module 5: XP System (admin only for management)
  'xp-add', 'xpadd',
  'xp-remove', 'xpremove',
  'xp-reset', 'xpreset',
  'set-xp-channel', 'setxpchannel',
  'set-xp-role', 'setxprole',
  'remove-xp-role', 'removexpRole',
  'xp-enable', 'xpenable',
  'xp-disable', 'xpdisable',
  // Module 6: Transcripts (admin/mod for generate, admin for settings)
  'ticket-transcript', 'tickettranscript',
  'set-transcript-channel', 'settranscriptchannel',
  'transcripts',
  // Module 7: Server Booster Appreciation System (admin only)
  'booster-enable', 'boosterenable',
  'booster-disable', 'boosterdisable',
  'set-booster-channel', 'setboosterchannel',
  'set-booster-message', 'setboostermessage',
  'set-booster-banner', 'setboosterbanner',
  'set-booster-thumbnail', 'setboosterthumbnail',
  'set-booster-role', 'setboosterrole',
  'remove-booster-role', 'removeboosterrole',
  'booster-preview', 'boosterpreview',
  'booster-stats', 'boosterstats',
  'booster-list', 'boosterlist',
  'booster-logs', 'boosterlogs',
  'set-booster-reactions', 'setboosterreactions',
  'booster-dm-enable', 'boosterdmenable',
  'booster-dm-disable', 'boosterdmdisable',
  'set-booster-dm', 'setboosterdm',
  // Module 8: Auto Role System (admin only)
  'autorole-enable', 'autoroleenable',
  'autorole-disable', 'autoroledisable',
  'set-autorole', 'setautorole',
  'remove-autorole', 'removeautorole',
  'autorole-status', 'autorolestatus',
  'autorole-preview', 'autorolepreview',
  'autorole-logs', 'autorolelogs',
  'set-autorole-delay', 'setautoroledelay',
  'set-autorole-log', 'setautorolelog',
  'autorole-ignore-bots-enable', 'autoroleignorebotsenable',
  'autorole-ignore-bots-disable', 'autoroleignorebotsdisable',
]);

module.exports = { isAdmin, isSupport, ADMIN_COMMANDS };
