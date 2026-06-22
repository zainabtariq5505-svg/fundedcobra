const prisma = require('../database/prisma');
const logger = require('../utils/logger');

/**
 * Logs an admin action to the audit trail.
 * @param {object} params
 * @param {string} params.guildId
 * @param {string} params.adminId - Discord user ID
 * @param {string} params.action  - e.g. 'IMPORT_URL', 'DELETE_SOURCE', 'SET_LEAD_STATUS'
 * @param {string} [params.target]
 * @param {string} [params.details]
 */
async function log({ guildId, adminId, action, target = null, details = null }) {
  try {
    await prisma.adminAuditLog.create({ data: { guildId, adminId, action, target, details } });
  } catch (err) {
    logger.error('auditLogService.log failed:', err);
  }
}

/**
 * Returns recent audit log entries for a guild.
 * @param {string} guildId
 * @param {number} limit
 */
async function getRecentLogs(guildId, limit = 50) {
  return prisma.adminAuditLog.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { log, getRecentLogs };
