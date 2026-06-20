import { prisma } from "@/lib/prisma";
import AdminsClient from "./admins-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.adminUser.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  const total = await prisma.adminUser.count();
  const active = await prisma.adminUser.count({ where: { disabled: false } });
  const adminRoles = await prisma.adminUser.count({ where: { role: 'admin' } });
  return (
    <AdminsClient data={data} stats={{ total, active, adminRoles }} />
  );
}
