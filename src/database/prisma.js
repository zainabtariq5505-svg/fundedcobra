const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

function normalizeDatabaseUrl(url) {
  if (!url || !/^mongodb(\+srv)?:\/\//i.test(url)) {
    return url;
  }

  const match = url.match(/^(mongodb(?:\+srv)?:\/\/[^/?#]+)(\/[^?#]*)?(\?[^#]*)?$/i);
  if (!match) {
    return url;
  }

  const prefix = match[1];
  const path = match[2] || '';
  const query = match[3] || '';

  if (path && path !== '/') {
    return url;
  }

  return `${prefix}/fundedcobra${query}`;
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (databaseUrl && databaseUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

// Singleton Prisma client — reused across all imports
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
    : ['warn', 'error'],
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query} — ${e.duration}ms`);
  });
}

module.exports = prisma;
