const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Change provider
content = content.replace('provider = "mongodb"', 'provider = "postgresql"');

// Replace @id @default(auto()) @map("_id") @db.ObjectId with @id @default(uuid())
content = content.replace(/@id\s+@default\(auto\(\)\)\s+@map\("_id"\)\s+@db\.ObjectId/g, '@id @default(uuid())');

// Remove remaining @db.ObjectId (foreign keys)
content = content.replace(/@db\.ObjectId/g, '');

// Fix @db.Date to @db.Date or just DateTime
content = content.replace(/@db\.Date/g, '@db.Date');

fs.writeFileSync(schemaPath, content);
console.log('Schema migrated to PostgreSQL.');
