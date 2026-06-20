import { prisma } from "@/lib/prisma";
import ModerationClient from "./moderation-client";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const cases = await prisma.moderationCase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const activeBans = await prisma.moderationCase.count({
    where: { actionType: "ban", status: "active" }
  });
  
  const activeMutes = await prisma.moderationCase.count({
    where: { actionType: "mute", status: "active" }
  });

  const warningsGiven = await prisma.warning.count();
  
  // placeholder until we add automod table
  const autoModActions = 0; 

  return (
    <ModerationClient 
      initialCases={cases}
      stats={{
        activeBans,
        activeMutes,
        warningsGiven,
        autoModActions
      }}
    />
  );
}