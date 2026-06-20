import { prisma } from "@/lib/prisma";
import WelcomeClient from "./welcome-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const logs = await prisma.welcomeLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const settings = await prisma.welcomeSettings.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const total = await prisma.welcomeLog.count();
  const enabled = await prisma.welcomeSettings.count({ where: { enabled: true } });
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayCount = await prisma.welcomeLog.count({ where: { createdAt: { gte: today, lt: tomorrow } } });
  return <WelcomeClient logs={logs} settings={settings} stats={{ total, enabled, todayCount }} />;
}
