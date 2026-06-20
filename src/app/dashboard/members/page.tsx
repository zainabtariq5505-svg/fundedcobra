import { prisma } from "@/lib/prisma";
import MembersClient from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await prisma.memberSnapshot.findMany({
    take: 100,
    orderBy: { joinDate: 'desc' }
  });

  const total = await prisma.memberSnapshot.count();
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const newThisWeek = await prisma.memberSnapshot.count({
    where: {
      joinDate: {
        gte: oneWeekAgo
      }
    }
  });

  return (
    <MembersClient 
      initialMembers={members}
      stats={{ total, newThisWeek }}
    />
  );
}