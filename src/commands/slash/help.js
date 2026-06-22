const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the interactive FundedCobra help menu'),

  async execute(interaction) {
    const roleLevel = await getUserRoleLevel(interaction.member, interaction.guild?.id);
    const visibleCats = CATEGORIES.filter(c => c.roleLevel <= roleLevel);

    const db = interaction.guild ? await prisma.helpMenuSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null) : null;
    const banner    = db?.bannerUrl    || brand.HELP_MENU_BANNER_URL;
    const thumbnail = db?.thumbnailUrl || brand.HELP_MENU_THUMBNAIL_URL;

    const embed = new EmbedBuilder()
      .setColor(brand.BRAND_COLOR)
      .setTitle('🐍 FundedCobra Control Center')
      .setDescription(
        '**Premium AI-powered Discord bot for FundedCobra**\n\n' +
        'Select a category from the dropdown below to browse commands.\n' +
        'Use `/ask` to get instant AI answers about rules and policies.'
      )
      .addFields(
        { name: '🤖 AI Support',  value: 'Instant answers about FundedCobra',  inline: true },
        { name: '🎫 Tickets',     value: 'Open a support ticket',              inline: true },
        { name: '💰 Info',        value: 'Pricing, payouts & accounts',         inline: true },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (banner)    embed.setImage(banner);
    if (thumbnail) embed.setThumbnail(thumbnail);

    const dropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder('📂 Select a category...')
        .addOptions(visibleCats.slice(0, 25).map(cat => ({
          label:       cat.label.replace(/[^\w\s\-]/g, '').trim().slice(0, 25) || cat.id,
          description: cat.description.slice(0, 50),
          value:       cat.id,
        })))
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 Website').setStyle(ButtonStyle.Link).setURL('https://fundedcobra.com'),
      new ButtonBuilder().setCustomId('ticket:open').setLabel('🎫 Open Ticket').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:ask_ai').setLabel('🤖 Ask AI').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setLabel('💰 Pricing').setStyle(ButtonStyle.Link).setURL('https://fundedcobra.com/accounts'),
    );

    await interaction.reply({ embeds: [embed], components: [dropdown, buttons] });

    // Disable menu after 5 minutes
    setTimeout(async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    }, 5 * 60 * 1000);
  },
};
