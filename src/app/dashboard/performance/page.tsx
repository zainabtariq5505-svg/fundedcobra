import { prisma } from "@/lib/prisma";
import PerformanceClient from "./performance-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.staffPerformanceSnapshot.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.staffPerformanceSnapshot.count();
  const totalClosed = await prisma.staffPerformanceSnapshot.aggregate({ _sum: { ticketsClosed: true } });
  const avgResponse = await prisma.staffPerformanceSnapshot.aggregate({ _avg: { avgResponseTime: true } });
  return <PerformanceClient data={data} stats={{ total, totalClosed: totalClosed._sum.ticketsClosed || 0, avgResponse: Math.round(avgResponse._avg.avgResponseTime || 0) }} />;
}
