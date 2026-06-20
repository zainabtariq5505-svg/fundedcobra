import { prisma } from "@/lib/prisma";
import BoostersClient from "./boosters-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.boosterLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.boosterLog.count();
  const uniqueBoosters = await prisma.boosterLog.groupBy({ by: ['userId'], _count: true });
  const settings = await prisma.boosterSettings.findMany();
  const enabledCount = settings.filter(s => s.enabled).length;
  return <BoostersClient data={data} stats={{ total, uniqueBoosters: uniqueBoosters.length, enabledCount }} />;
}
