/**
 * Switches the active Prisma schema between SQLite and MongoDB.
 * Usage:
 *   node src/scripts/switchDatabase.js mongo
 *   node src/scripts/switchDatabase.js sqlite
 *
 * After switching, run:
 *   npm run db:generate
 *   npm run db:push          (MongoDB)
 *   npm run db:migrate       (SQLite / PostgreSQL)
 */

const fs   = require('fs');
const path = require('path');

const target = process.argv[2]?.toLowerCase();
if (!['mongo', 'mongodb', 'sqlite', 'postgres', 'postgresql'].includes(target)) {
  console.error('Usage: node src/scripts/switchDatabase.js <mongo|sqlite>');
  process.exit(1);
}

const SCHEMA_DIR    = path.join(__dirname, '..', '..', 'prisma');
const ACTIVE_SCHEMA = path.join(SCHEMA_DIR, 'schema.prisma');
const MONGO_SCHEMA  = path.join(SCHEMA_DIR, 'schema.mongodb.prisma');
const SQLITE_SCHEMA = path.join(SCHEMA_DIR, 'schema.sqlite.prisma');

// Back up the current active schema before overwriting
const isMongo = ['mongo', 'mongodb'].includes(target);

if (isMongo) {
  // Save current schema as sqlite backup (if it looks like sqlite/postgres)
  const current = fs.readFileSync(ACTIVE_SCHEMA, 'utf8');
  if (!current.includes('provider = "mongodb"')) {
    fs.writeFileSync(SQLITE_SCHEMA, current, 'utf8');
    console.log('Backed up current schema → prisma/schema.sqlite.prisma');
  }

  if (!fs.existsSync(MONGO_SCHEMA)) {
    console.error('MongoDB schema not found at prisma/schema.mongodb.prisma');
    process.exit(1);
  }

  fs.copyFileSync(MONGO_SCHEMA, ACTIVE_SCHEMA);
  console.log('✅ Switched to MongoDB schema.');
  console.log('\nNext steps:');
  console.log('  1. Set DATABASE_URL to your MongoDB connection string in .env');
  console.log('     e.g. mongodb+srv://user:pass@cluster.mongodb.net/fundedcobra');
  console.log('  2. npm run db:generate');
  console.log('  3. npm run db:push');
  console.log('  4. node src/scripts/seed.js');

} else {
  // Switch to SQLite/Postgres
  const backup = fs.existsSync(SQLITE_SCHEMA)
    ? SQLITE_SCHEMA
    : null;

  if (!backup) {
    console.error('No SQLite backup found at prisma/schema.sqlite.prisma');
    console.error('Manually restore your schema or use the original from the repo.');
    process.exit(1);
  }

  fs.copyFileSync(backup, ACTIVE_SCHEMA);
  console.log('✅ Switched back to SQLite/PostgreSQL schema.');
  console.log('\nNext steps:');
  console.log('  1. Set DATABASE_URL=file:./data/fundedcobra.db in .env (SQLite)');
  console.log('     or  DATABASE_URL=postgresql://... (PostgreSQL)');
  console.log('  2. npm run db:generate');
  console.log('  3. npm run db:migrate');
}
