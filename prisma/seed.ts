import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Supabase Seeding...');

  // 1. Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fundedcobra.com';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('ChangeThisPassword123!', 10);
    await prisma.adminUser.create({
      data: {
        name: 'FundedCobra Admin',
        email: adminEmail,
        passwordHash,
        role: 'owner',
      },
    });
    console.log(`Created initial admin user: ${adminEmail}`);
  }

  // 2. Members & Join Logs
  console.log('Seeding members...');
  for (let i = 0; i < 50; i++) {
    await prisma.memberSnapshot.create({
      data: {
        userId: `1000000000000${i}`,
        guildId: '1234567890',
        joinDate: new Date(Date.now() - Math.random() * 10000000000),
        xpLevel: Math.floor(Math.random() * 50),
        inviteCount: Math.floor(Math.random() * 10),
      }
    });
  }

  // 3. Tickets
  console.log('Seeding tickets...');
  const priorities = ['low', 'normal', 'high', 'urgent'];
  const statuses = ['open', 'in_progress', 'closed'];
  for (let i = 0; i < 30; i++) {
    await prisma.ticket.create({
      data: {
        guildId: '1234567890',
        userId: `2000000000000${i}`,
        category: 'Support',
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        aiEnabled: true,
      }
    });
  }

  // 4. Moderation Cases
  console.log('Seeding moderation cases...');
  const actionTypes = ['ban', 'mute', 'warn', 'kick'];
  for (let i = 0; i < 20; i++) {
    await prisma.moderationCase.create({
      data: {
        guildId: '1234567890',
        userId: `3000000000000${i}`,
        moderatorId: `Admin${i%3}`,
        actionType: actionTypes[Math.floor(Math.random() * actionTypes.length)],
        reason: 'Automod Triggered',
        status: 'active',
      }
    });
  }

  // 5. Leads
  console.log('Seeding leads...');
  const leadStatuses = ['new', 'warm', 'hot'];
  for (let i = 0; i < 15; i++) {
    await prisma.lead.create({
      data: {
        guildId: '1234567890',
        userId: `4000000000000${i}`,
        score: Math.floor(Math.random() * 100),
        status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
        salesStage: 'prospecting',
      }
    });
  }

  // 6. AI Question Logs
  console.log('Seeding AI logs...');
  for (let i = 0; i < 40; i++) {
    await prisma.questionLog.create({
      data: {
        guildId: '1234567890',
        userId: `5000000000000${i}`,
        channelId: 'ticket-channel',
        question: 'How do I buy?',
        answer: 'You can buy via our portal.',
        confidence: Math.random(),
        needsHuman: Math.random() > 0.8,
      }
    });
  }

  console.log('Supabase Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
