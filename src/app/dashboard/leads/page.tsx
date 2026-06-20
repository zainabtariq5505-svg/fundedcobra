import { prisma } from "@/lib/prisma";
import LeadsClient from "./leads-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.lead.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.lead.count();
  const newLeads = await prisma.lead.count({ where: { status: 'new' } });
  const hotLeads = await prisma.lead.count({ where: { status: 'hot' } });
  return <LeadsClient data={data} stats={{ total, newLeads, hotLeads }} />;
}
