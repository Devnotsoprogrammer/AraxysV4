const {
  Message,
  EmbedBuilder,
  PermissionFlagsBits,
  ColorResolvable,
  GuildMember,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const fs = require("fs");
const path = require("path");
const Araxys = require("../../core/Araxys");

// Define the path to the database file
const dbPath = path.join(__dirname, "../../quickData/extraowner_users.sqlite");
const dbDir = path.dirname(dbPath);

// Check if the directory exists, and create it if it doesn't
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new QuickDB({ filePath: dbPath });
const GrantUser = ["1203931944421949533"];

module.exports = {
  name: "extraowner",
  aliases: ["eo", "trust"],
  description:
    "Add, remove, show a specific user for a guild, manage permissions, and reset settings.",
  usage: "<add|remove|show|grant|revoke|reset> <user>",
  category: "moderation",
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(client, message, args) {
    // return message.reply("This Command Is Under Development!");
    const [action, target] = args;
    if (!action) {
      return message.reply(
        "Please specify an action: add, remove, show, grant, revoke, or reset."
      );
    }
    const guildId = message.guild?.id;
    if (!guildId) {
      return message.reply("This command can only be used in a guild.");
    }
    const userId = message.author.id;
    const guildOwnerId = message.guild.ownerId;
    // Check if the user is the guild owner, in GrantUser list, or has permissions
    const hasPermission =
      userId === guildOwnerId ||
      GrantUser.includes(userId) ||
      (await db.get(`guild_${guildId}.extraowner.${userId}`));
    if (!hasPermission) {
      return message.reply("You do not have permission to use this command.");
    }
    // Command-specific logic
    if (action === "add") {
      if (!target) {
        return message.reply("Please mention a user to add.");
      }
      const user = message.mentions.users.first();
      if (!user) {
        return message.reply("User not found.");
      }
      const existingUser = await db.get(`guild_${guildId}.user`);
      if (existingUser) {
        return message.reply(
          'There is already an extraowner set. Please use "extraowner reset" or "extraowner remove" to add someone else.'
        );
      }
      await db.set(`guild_${guildId}.user`, user.id);
      return message.reply(
        `Added ${user.username} as the specific user for this guild.`
      );
    }
    if (action === "remove") {
      await db.delete(`guild_${guildId}.user`);
      return message.reply("Removed the specific user for this guild.");
    }
    if (action === "show") {
      const userId = await db.get(`guild_${guildId}.user`);
      if (!userId) {
        return message.reply("No specific user set for this guild.");
      }
      const user = await client.users.fetch(userId);
      return message.reply(
        `The specific user for this guild is ${user.username}.`
      );
    }
    if (action === "grant") {
      if (!target) {
        return message.reply("Please mention a user to grant permission.");
      }
      const user = message.mentions.users.first();
      if (!user) {
        return message.reply("User not found.");
      }
      await db.set(`guild_${guildId}.extraowner.${user.id}`, true);
      return message.reply(`Granted permission to ${user.username}.`);
    }
    if (action === "revoke") {
      if (!target) {
        return message.reply("Please mention a user to revoke permission.");
      }
      const user = message.mentions.users.first();
      if (!user) {
        return message.reply("User not found.");
      }
      await db.delete(`guild_${guildId}.extraowner.${user.id}`);
      return message.reply(`Revoked permission from ${user.username}.`);
    }
    if (action === "reset") {
      await db.delete(`guild_${guildId}.user`);
      await db.delete(`guild_${guildId}.extraowner`);
      return message.reply("Reset all user settings for this guild.");
    }
    return message.reply(
      "Invalid action. Please specify add, remove, show, grant, revoke, or reset."
    );
  },
};
