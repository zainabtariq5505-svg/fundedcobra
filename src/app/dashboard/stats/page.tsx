import { prisma } from "@/lib/prisma";
import StatsClient from "./stats-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const messages = await prisma.messageStats.findMany({ take: 50, orderBy: { date: 'desc' } });
  const channels = await prisma.channelStats.findMany({ take: 50, orderBy: { date: 'desc' } });
  const totalMessages = await prisma.messageStats.aggregate({ _sum: { count: true } });
  const totalChannels = await prisma.channelStats.count();
  const totalMessageRecords = await prisma.messageStats.count();
  return <StatsClient messages={messages} channels={channels} stats={{ totalMessages: totalMessages._sum.count || 0, totalChannels, totalMessageRecords }} />;
}
