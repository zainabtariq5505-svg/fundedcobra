import { prisma } from "@/lib/prisma";
import InvitesClient from "./invites-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.inviteLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.inviteLog.count();
  const valid = await prisma.inviteLog.count({ where: { status: 'valid' } });
  const left = await prisma.inviteLog.count({ where: { status: 'left' } });
  const fake = await prisma.inviteLog.count({ where: { status: 'fake' } });
  const stats = await prisma.inviteStats.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  return <InvitesClient data={data} statsData={stats} stats={{ total, valid, left, fake }} />;
}
