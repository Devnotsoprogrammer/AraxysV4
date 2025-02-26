const {
  EmbedBuilder,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  User,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const { Database } = require("quickmongo");
const fs = require("fs");
const path = require("path");
const Araxys = require("./Araxys");
const db = require("../database/blacklistDB");
const commandUsageDb = require("../database/commandUsageTracker");

// Define the path to the database file
const dbPath = path.join(__dirname, "../quickData/extraowner_users.sqlite");
const dbDir = path.dirname(dbPath);

// Check if the directory exists, and create it if it doesn't
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const quickDb = new QuickDB({ filePath: dbPath });

class Util {
  constructor(client) {
    this.client = client;
    this.whitelistDb = client.db;
  }

  // Function to create an embed
  createEmbed(title, description, color) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color || this.client.color)
      .setTimestamp()
      .setFooter({
        text: this.client.user?.username || "",
        iconURL: this.client.user?.displayAvatarURL() || "",
      });
  }

  // Function to check if a user is an extra owner of the guild
  async isExtraOwner(guildId, userId) {
    const guildOwnerId = (await this.client.guilds.fetch(guildId)).ownerId;
    const extraOwner = await quickDb.get(`guild_${guildId}.extraowner.${userId}`);
    return userId === guildOwnerId || extraOwner !== undefined;
  }

  // Function to check if a user is whitelisted for a specific action (using quickmongo)
  async isWhitelisted(guildId, userId, action) {
    const whitelistData = await this.whitelistDb.get(`${guildId}_${userId}_wl`);
    return whitelistData?.[action] === true;
  }

  // Function to check if a user is blacklisted globally
  async isBlackListedUser(userId) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM blacklisted_users WHERE userId = ?`, [userId], (err, row) => {
        if (err) return reject(err);
        resolve(row !== undefined);
      });
    });
  }

  // Function to check if a server is blacklisted
  async isBlackListedServer(guildId) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM blacklisted_servers WHERE guildId = ?`, [guildId], (err, row) => {
        if (err) return reject(err);
        resolve(row !== undefined);
      });
    });
  }

  // Function to check if a user is temporarily blacklisted
  async isTempBlackListedUser(userId) {
    return new Promise((resolve, reject) => {
      commandUsageDb.get(`temp_blacklisted_users_${userId}`).then(row => {
        if (row) {
          const timeLeft = row.expires_at - Date.now();
          if (timeLeft > 0) {
            return resolve(true);
          } else {
            // Remove expired temporary blacklist
            commandUsageDb.delete(`temp_blacklisted_users_${userId}`);
            return resolve(false);
          }
        }
        resolve(false);
      }).catch(err => reject(err));
    });
  }

  // Function to check if a server is temporarily blacklisted
  async isTempBlackListedServer(guildId) {
    return new Promise((resolve, reject) => {
      commandUsageDb.get(`temp_blacklisted_servers_${guildId}`).then(row => {
        if (row) {
          const timeLeft = row.expires_at - Date.now();
          if (timeLeft > 0) {
            return resolve(true);
          } else {
            // Remove expired temporary blacklist
            commandUsageDb.delete(`temp_blacklisted_servers_${guildId}`);
            return resolve(false);
          }
        }
        resolve(false);
      }).catch(err => reject(err));
    });
  }

  // Function to temporarily blacklist a user
  async tempBlacklistUser(userId, duration) {
    const expiresAt = Date.now() + duration;
    return new Promise((resolve, reject) => {
      commandUsageDb.set(`temp_blacklisted_users_${userId}`, { expires_at: expiresAt }).then(() => resolve()).catch(err => reject(err));
    });
  }

  // Function to temporarily blacklist a server
  async tempBlacklistServer(guildId, duration) {
    const expiresAt = Date.now() + duration;
    return new Promise((resolve, reject) => {
      commandUsageDb.set(`temp_blacklisted_servers_${guildId}`, { expires_at: expiresAt }).then(() => resolve()).catch(err => reject(err));
    });
  }

  // Function to send an embed to a channel
  async sendEmbed(channelId, title, description, color) {
    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !this.isTextBasedChannel(channel)) {
      console.error("Channel is not text-based or does not exist");
      return;
    }

    const embed = this.createEmbed(title, description, color);
    await channel.send({ embeds: [embed] });
  }

  // Helper function to check if a channel is text-based
  isTextBasedChannel(channel) {
    return (
      channel instanceof TextChannel ||
      channel instanceof NewsChannel ||
      channel instanceof ThreadChannel
    );
  }

  // Function to ban a user
  async banUser(guildId, user, reason) {
    const guild = await this.client.guilds.fetch(guildId);
    const member = guild.members.cache.get(user.id);

    if (!member) {
      throw new Error("User not found in this guild.");
    }

    const embed = this.createEmbed(
      `You have been banned from **${guild.name}**`,
      `**Reason:** ${reason}`,
      "RED"
    );

    try {
      await user.send({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to send DM to the user:", error);
    }

    await member.ban({ reason });
  }

  // Function to ban a user if not whitelisted
  async banIfNotWhitelisted(guildId, user, action, reason) {
    const isWhitelisted = await this.isWhitelisted(guildId, user.id, action);
    if (!isWhitelisted) {
      await this.banUser(guildId, user, reason);
    }
  }
}

module.exports = Util;
