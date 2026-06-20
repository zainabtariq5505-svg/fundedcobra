import { prisma } from "@/lib/prisma";
import BrandClient from "./brand-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.brandAssets.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const total = await prisma.brandAssets.count();
  const withLogo = await prisma.brandAssets.count({ where: { mainLogo: { not: null } } });
  const withBanner = await prisma.brandAssets.count({ where: { welcomeBanner: { not: null } } });
  return <BrandClient data={data} stats={{ total, withLogo, withBanner }} />;
}
