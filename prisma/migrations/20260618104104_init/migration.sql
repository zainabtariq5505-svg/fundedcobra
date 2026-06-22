-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "lastFollowupAt" DATETIME;

-- AlterTable
ALTER TABLE "QuestionLog" ADD COLUMN "language" TEXT;

-- CreateTable
CREATE TABLE "WelcomeSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "welcomeBannerUrl" TEXT,
    "welcomeThumbnailUrl" TEXT,
    "welcomeRoleId" TEXT,
    "dmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dmMessage" TEXT,
    "button1Label" TEXT,
    "button1Url" TEXT,
    "button2Label" TEXT,
    "button2Url" TEXT,
    "button3Label" TEXT,
    "button3Url" TEXT,
    "button4Label" TEXT,
    "button4Url" TEXT,
    "button5Label" TEXT,
    "button5Url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WelcomeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "welcomeChannelId" TEXT,
    "dmSent" BOOLEAN NOT NULL DEFAULT false,
    "roleAssigned" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "messageId" TEXT,
    "question" TEXT,
    "answer" TEXT,
    "helpful" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "openerId" TEXT NOT NULL,
    "openerUsername" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedBy" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnansweredQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "question" TEXT NOT NULL,
    "intent" TEXT,
    "confidence" REAL,
    "language" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "officialAnswer" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "thumbnailUrl" TEXT,
    "buttonLabel" TEXT,
    "buttonUrl" TEXT,
    "targetChannelId" TEXT,
    "pingRoleId" TEXT,
    "announcementType" TEXT NOT NULL DEFAULT 'General News',
    "footerText" TEXT NOT NULL DEFAULT '@fundedcobra',
    "colorTheme" TEXT NOT NULL DEFAULT 'GOLD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "sentBy" TEXT,
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "createdBy" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "description" TEXT,
    "winnerCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requiredRoleId" TEXT,
    "bonusRoleId" TEXT,
    "bannerUrl" TEXT,
    "thumbnailUrl" TEXT,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giveawayId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "entriesCount" INTEGER NOT NULL DEFAULT 1,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiveawayWinner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giveawayId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "wonAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rerollNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GiveawayWinner_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuildSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "adminRoleId" TEXT,
    "supportRoleId" TEXT,
    "rulesChannelId" TEXT,
    "supportChannelId" TEXT,
    "pricingChannelId" TEXT,
    "leadChannelId" TEXT,
    "leadAlertChannelId" TEXT,
    "adminReportChannelId" TEXT,
    "ticketCategoryId" TEXT,
    "dmFollowupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dmFollowupCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "offerText" TEXT,
    "couponText" TEXT,
    "pricingText" TEXT,
    "accountsText" TEXT,
    "payoutsText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GuildSettings" ("adminRoleId", "createdAt", "guildId", "id", "prefix", "updatedAt") SELECT "adminRoleId", "createdAt", "guildId", "id", "prefix", "updatedAt" FROM "GuildSettings";
DROP TABLE "GuildSettings";
ALTER TABLE "new_GuildSettings" RENAME TO "GuildSettings";
CREATE UNIQUE INDEX "GuildSettings_guildId_key" ON "GuildSettings"("guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeSettings_guildId_key" ON "WelcomeSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");
