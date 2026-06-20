import { prisma } from "@/lib/prisma";
import SecurityClient from "./security-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const watchlist = await prisma.watchlist.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
  const blacklist = await prisma.blacklist.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
  const cases = await prisma.moderationCase.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
  const totalWatchlist = await prisma.watchlist.count();
  const totalBlacklist = await prisma.blacklist.count();
  const totalCases = await prisma.moderationCase.count();
  return <SecurityClient watchlist={watchlist} blacklist={blacklist} cases={cases} stats={{ totalWatchlist, totalBlacklist, totalCases }} />;
}
