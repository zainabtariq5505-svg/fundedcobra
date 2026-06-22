const prisma = require('../database/prisma');

async function getGuildSettings(guildId) {
  return prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

async function updateGuildSettings(guildId, data) {
  await getGuildSettings(guildId);
  return prisma.guildSettings.update({
    where: { guildId },
    data,
  });
}

async function setGuildSetting(guildId, key, value) {
  return updateGuildSettings(guildId, { [key]: value });
}

module.exports = { getGuildSettings, updateGuildSettings, setGuildSetting };
