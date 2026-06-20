import { prisma } from "@/lib/prisma";
import GiveawaysClient from "./giveaways-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.giveaway.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.giveaway.count();
  const active = await prisma.giveaway.count({ where: { status: 'active' } });
  const entries = await prisma.giveawayEntry.count();
  return <GiveawaysClient data={data} stats={{ total, active, entries }} />;
}
