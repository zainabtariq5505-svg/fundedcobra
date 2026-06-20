import { prisma } from "@/lib/prisma";
import SocialClient from "./social-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const accounts = await prisma.socialAccount.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const posts = await prisma.socialPost.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const notifierSettings = await prisma.socialNotifierSettings.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const totalAccounts = await prisma.socialAccount.count();
  const totalPosts = await prisma.socialPost.count();
  const enabled = await prisma.socialAccount.count({ where: { enabled: true } });
  return <SocialClient accounts={accounts} posts={posts} notifierSettings={notifierSettings} stats={{ totalAccounts, totalPosts, enabled }} />;
}
