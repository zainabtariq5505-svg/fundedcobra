const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../../database/prisma');
const brand = require('../../config/brandAssets');
const { CATEGORIES } = require('../../config/helpCategories');
const { isAdmin } = require('../../config/permissions');
const { isModerator } = require('../../services/moderationService');

const FOOTER = { text: brand.DEFAULT_FOOTER_TEXT, iconURL: brand.FOOTER_ICON_URL };

async function getUserRoleLevel(member, guildId) {
  if (!member) return 0;
  try {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } }).catch(() => null);
    if (isAdmin(member, settings?.adminRoleId)) return 2;
    if (await isModerator(member, guildId).catch(() => false)) return 1;
  } catch {}
  return 0;
}

async function getHelpAssets(guildId) {
  const db = guildId ? await prisma.helpMenuSettings.findUnique({ where: { guildId } }).catch(() => null) : null;
  return { banner: db?.bannerUrl || brand.HELP_MENU_BANNER_URL, thumbnail: db?.thumbnailUrl || brand.HELP_MENU_THUMBNAIL_URL };
}

function buildMainEmbed(banner, thumbnail) {
  const embed = new EmbedBuilder()
    .setColor(brand.BRAND_COLOR)
    .setTitle('🐍 FundedCobra Control Center')
    .setDescription(
      '**Premium AI-powered Discord bot for FundedCobra**\n\n' +
      'Select a category from the dropdown below to browse commands.\n' +
      'Use `/ask` or `!ask` to get instant AI answers about rules and policies.\n\n' +
      '> Slash commands start with `/` · Prefix commands start with `!`'
    )
    .addFields(
      { name: '🤖 AI Support',        value: 'Instant answers about FundedCobra',    inline: true },
      { name: '🎫 Tickets',           value: 'Open a support ticket',                inline: true },
      { name: '💰 Info',              value: 'Pricing, payouts & accounts',           inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
  if (banner)    embed.setImage(banner);
  if (thumbnail) embed.setThumbnail(thumbnail);
  return embed;
}

function buildCategoryEmbed(cat, thumbnail) {
  const allCmds = [...(cat.commands ?? []), ...(cat.adminCommands ?? [])];
  const embed = new EmbedBuilder()
    .setColor(brand.ACCENT_COLOR)
    .setTitle(`${cat.label}`)
    .setDescription(cat.description)
    .setFooter(FOOTER)
    .setTimestamp();
  if (thumbnail) embed.setThumbnail(thumbnail);
  for (const cmd of allCmds.slice(0, 20)) {
    embed.addFields({ name: `\`${cmd.name}\``, value: cmd.description + (cmd.example ? `\nExample: \`${cmd.example}\`` : ''), inline: false });
  }
  if (!allCmds.length) embed.setDescription(cat.description + '\n\n*No commands listed.*');
  return embed;
}

function buildDropdown(categories) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help:category')
      .setPlaceholder('📂 Select a category...')
      .addOptions(categories.slice(0, 25).map(cat => ({
        label:       cat.label.replace(/[^\w\s\-]/g, '').trim().slice(0, 25) || cat.id,
        description: cat.description.slice(0, 50),
        value:       cat.id,
      })))
  );
}

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🌐 Website').setStyle(ButtonStyle.Link).setURL('https://fundedcobra.com'),
    new ButtonBuilder().setCustomId('ticket:open').setLabel('🎫 Open Ticket').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help:ask_ai').setLabel('🤖 Ask AI').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('💰 Pricing').setStyle(ButtonStyle.Link).setURL('https://fundedcobra.com/accounts'),
  );
}

module.exports = {
  name: 'help',
  aliases: ['menu', 'commands'],
  description: 'Show the interactive FundedCobra help menu',
  usage: '!help',

  // Exported for use by the interaction handler
  buildCategoryEmbed,
  getHelpAssets,
  CATEGORIES,

  async execute(message) {
    const roleLevel = await getUserRoleLevel(message.member, message.guild?.id);
    const visibleCats = CATEGORIES.filter(c => c.roleLevel <= roleLevel);
    const assets = await getHelpAssets(message.guild?.id);

    const embed    = buildMainEmbed(assets.banner, assets.thumbnail);
    const dropdown = buildDropdown(visibleCats);
    const buttons  = buildButtons();

    const reply = await message.reply({ embeds: [embed], components: [dropdown, buttons] });

    setTimeout(() => reply.edit({ components: [] }).catch(() => {}), 5 * 60 * 1000);
  },
};
