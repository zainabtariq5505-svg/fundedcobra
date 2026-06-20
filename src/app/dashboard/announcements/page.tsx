import { prisma } from "@/lib/prisma";
import AnnouncementsClient from "./announcements-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.announcement.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.announcement.count();
  const scheduled = await prisma.announcement.count({ where: { status: 'scheduled' } });
  const sent = await prisma.announcement.count({ where: { status: 'sent' } });
  return <AnnouncementsClient data={data} stats={{ total, scheduled, sent }} />;
}
