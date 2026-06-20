import { prisma } from "@/lib/prisma";
import DashboardOverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  // Fetch real data from MongoDB via Prisma
  
  // 1. Total Members
  const totalMembers = await prisma.memberSnapshot.count();
  
  // 2. New Joins (last 24h)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newJoins = await prisma.memberJoinLog.count({
    where: {
      joinedAt: {
        gte: yesterday
      }
    }
  });

  // 3. Active Tickets
  const activeTickets = await prisma.ticket.count({
    where: {
      status: "open"
    }
  });

  // 4. Hot Leads
  const hotLeads = await prisma.lead.count({
    where: {
      status: "hot"
    }
  });

  // 5. AI Stats
  const aiAnswered = await prisma.questionLog.count();
  const aiNeedsHuman = await prisma.questionLog.count({
    where: { needsHuman: true }
  });

  // 6. Moderation Stats
  const activeBans = await prisma.moderationCase.count({
    where: { actionType: "ban", status: "active" }
  });
  const activeTimeouts = await prisma.moderationCase.count({
    where: { actionType: "mute", status: "active" }
  });

  const stats = {
    totalMembers,
    newJoins,
    activeTickets,
    hotLeads,
    aiAnswered,
    aiNeedsHuman,
    activeBans,
    activeTimeouts
  };

  return <DashboardOverviewClient initialStats={stats} />;
}
