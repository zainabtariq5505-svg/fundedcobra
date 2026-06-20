import { prisma } from "@/lib/prisma";
import XpClient from "./xp-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.userXP.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const logs = await prisma.xPLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.userXP.count();
  const totalXP = await prisma.userXP.aggregate({ _sum: { xp: true } });
  const avgLevel = await prisma.userXP.aggregate({ _avg: { level: true } });
  return <XpClient data={data} logs={logs} stats={{ total, totalXP: totalXP._sum.xp || 0, avgLevel: Math.round(avgLevel._avg.level || 0) }} />;
}
