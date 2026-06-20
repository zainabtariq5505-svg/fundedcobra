import { prisma } from "@/lib/prisma";
import AiLogsClient from "./ai-logs-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.questionLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const total = await prisma.questionLog.count();
  const needsHuman = await prisma.questionLog.count({ where: { needsHuman: true } });
  const avgConfidence = await prisma.questionLog.aggregate({ _avg: { confidence: true } });
  return (
    <AiLogsClient data={data} stats={{ total, needsHuman, avgConfidence: avgConfidence._avg.confidence || 0 }} />
  );
}
