import { prisma } from "@/lib/prisma";
import AuditClient from "./audit-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.adminAuditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.adminAuditLog.count();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayCount = await prisma.adminAuditLog.count({ where: { createdAt: { gte: today, lt: tomorrow } } });
  const uniqueAdmins = await prisma.adminAuditLog.groupBy({ by: ['adminId'], _count: true });
  return <AuditClient data={data} stats={{ total, todayCount, uniqueAdmins: uniqueAdmins.length }} />;
}
