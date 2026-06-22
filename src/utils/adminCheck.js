const { isAdmin } = require('../config/permissions');
const embeds = require('./embeds');
const prisma = require('../database/prisma');

/**
 * Checks if the author of a prefix command message is an admin.
 * Replies with an error embed if not authorized.
 * @param {import('discord.js').Message} message
 * @returns {Promise<boolean>}
 */
async function checkAdminMessage(message) {
  if (!message.guild) return false;

  // Fetch guild-specific admin role from DB
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId: message.guild.id },
  }).catch(() => null);

  if (isAdmin(message.member, settings?.adminRoleId)) return true;

  await message.reply({ embeds: [embeds.error('You need **Administrator** permission or the admin role to use this command.')] });
  return false;
}

/**
 * Checks if the interaction user is an admin.
 * Replies with an error embed if not authorized.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {Promise<boolean>}
 */
async function checkAdminInteraction(interaction) {
  if (!interaction.guild) return false;

  const settings = await prisma.guildSettings.findUnique({
    where: { guildId: interaction.guild.id },
  }).catch(() => null);

  if (isAdmin(interaction.member, settings?.adminRoleId)) return true;

  await interaction.reply({
    embeds: [embeds.error('You need **Administrator** permission or the admin role to use this command.')],
    ephemeral: true,
  });
  return false;
}

module.exports = { checkAdminMessage, checkAdminInteraction };
