import { prisma } from "@/lib/prisma";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const guildSettings = await prisma.guildSettings.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const toggles = await prisma.featureToggle.findMany({ take: 50, orderBy: { updatedAt: 'desc' } });
  const totalGuilds = await prisma.guildSettings.count();
  const enabledFeatures = await prisma.featureToggle.count({ where: { moderation: true } });
  return <SettingsClient guildSettings={guildSettings} toggles={toggles} stats={{ totalGuilds, enabledFeatures }} />;
}
