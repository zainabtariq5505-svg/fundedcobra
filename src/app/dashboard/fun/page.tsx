import { prisma } from "@/lib/prisma";
import FunClient from "./fun-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const games = await prisma.gameStats.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const coins = await prisma.cobraCoins.findMany();
  const totalPlayers = await prisma.gameStats.count();
  const totalCoins = await prisma.cobraCoins.aggregate({ _sum: { balance: true } });
  const totalGames = await prisma.gameStats.groupBy({ by: ['game'], _count: true });
  return <FunClient games={games} coins={coins} stats={{ totalPlayers, totalGames: totalGames.length, totalCoins: totalCoins._sum.balance || 0 }} />;
}
