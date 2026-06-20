import { prisma } from "@/lib/prisma";
import EodClient from "./eod-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.employeeEOD.findMany({ take: 50, orderBy: { submittedAt: 'desc' } });
  const total = await prisma.employeeEOD.count();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayCount = await prisma.employeeEOD.count({ where: { submittedAt: { gte: today, lt: tomorrow } } });
  const totalTickets = await prisma.employeeEOD.aggregate({ _sum: { ticketsHandled: true } });
  const totalLeads = await prisma.employeeEOD.aggregate({ _sum: { leadsFollowedUp: true } });
  return <EodClient data={data} stats={{ total, todayCount, totalTickets: totalTickets._sum.ticketsHandled || 0, totalLeads: totalLeads._sum.leadsFollowedUp || 0 }} />;
}
