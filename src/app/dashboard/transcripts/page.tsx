import { prisma } from "@/lib/prisma";
import TranscriptsClient from "./transcripts-client";

export const dynamic = "force-dynamic";

export default async function TranscriptsPage() {
  const transcripts = await prisma.ticketTranscript.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const total = await prisma.ticketTranscript.count();
  const aiSummarized = await prisma.ticketTranscript.count({
    where: {
      aiSummary: { not: null }
    }
  });

  return (
    <TranscriptsClient 
      initialTranscripts={transcripts}
      stats={{ total, aiSummarized }}
    />
  );
}