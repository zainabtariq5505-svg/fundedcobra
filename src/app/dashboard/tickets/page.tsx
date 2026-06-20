import { prisma } from "@/lib/prisma";
import TicketsClient from "./tickets-client";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const open = await prisma.ticket.count({ where: { status: "open" } });
  const inProgress = await prisma.ticket.count({ where: { status: "in progress" } });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const resolvedToday = await prisma.ticket.count({
    where: {
      status: "closed",
      updatedAt: { gte: today }
    }
  });

  return (
    <TicketsClient 
      initialTickets={tickets}
      stats={{
        open,
        inProgress,
        resolvedToday,
        avgResponseMins: 4 // placeholder until we calculate real response times
      }}
    />
  );
}