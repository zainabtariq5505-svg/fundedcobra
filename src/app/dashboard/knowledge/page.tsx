import { prisma } from "@/lib/prisma";
import KnowledgeClient from "./knowledge-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sources = await prisma.knowledgeSource.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const gaps = await prisma.knowledgeGap.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const totalSources = await prisma.knowledgeSource.count();
  const pending = await prisma.knowledgeSource.count({ where: { status: 'pending' } });
  const totalGaps = await prisma.knowledgeGap.count();
  return <KnowledgeClient sources={sources} gaps={gaps} stats={{ totalSources, pending, totalGaps }} />;
}
