const { EmbedBuilder } = require("discord.js");
const db = require("../../database/sqlite");

module.exports = {
  name: "cleanpremium",
  aliases: ["refreshpremium", "premiumrefresh"],
  description: "Clean expired premium entries from database",
  usage: "cleanpremium",
  category: "premium",
  run: async (client, message, args) => {
    try {
      // Only allow bot owners/admins to use this command
      if (!client.config.ownerIds.includes(message.author.id)) {
        return message.reply("❌ You are not authorized to use this command!");
      }

      const loadingEmbed = new EmbedBuilder()
        .setDescription("🔄 Cleaning expired premium entries...")
        .setColor(client.color);
      const msg = await message.reply({ embeds: [loadingEmbed] });

      // Get counts before cleaning
      const [beforeUserCount, beforeGuildCount] = await Promise.all([
        getPremiumUserCount(),
        getPremiumGuildCount(),
      ]);

      // Clean expired entries
      await cleanExpiredPremium();

      // Get counts after cleaning
      const [afterUserCount, afterGuildCount] = await Promise.all([
        getPremiumUserCount(),
        getPremiumGuildCount(),
      ]);

      const removedUsers = beforeUserCount - afterUserCount;
      const removedGuilds = beforeGuildCount - afterGuildCount;

      const embed = new EmbedBuilder()
        .setTitle("Premium Database Cleaned")
        .setDescription("✅ Successfully removed expired premium entries!")
        .addFields(
          {
            name: "Users Removed",
            value: `${removedUsers} expired premium user(s)`,
            inline: true,
          },
          {
            name: "Guilds Removed",
            value: `${removedGuilds} expired premium guild(s)`,
            inline: true,
          },
          {
            name: "Current Status",
            value: `Active Premium:\n👤 Users: ${afterUserCount}\n🏰 Guilds: ${afterGuildCount}`,
          }
        )
        .setColor(client.color)
        .setTimestamp();

      msg.edit({ embeds: [embed] });
    } catch (error) {
      console.error("Error in cleanpremium command:", error);
      message.reply("An error occurred while cleaning premium database!");
    }
  },
};

// Function to clean expired premium entries
function cleanExpiredPremium() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Remove expired premium users
      db.run(
        `DELETE FROM premium_users WHERE expires_at < datetime('now')`,
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }
        }
      );

      // Remove expired premium guilds
      db.run(
        `DELETE FROM premium_guilds WHERE expires_at < datetime('now')`,
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }
        }
      );

      // Remove associated filter presets for expired premium users
      db.run(
        `
                DELETE FROM filter_presets 
                WHERE user_id NOT IN (
                    SELECT user_id FROM premium_users 
                    WHERE expires_at > datetime('now')
                )`,
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            return reject(err);
          }
        }
      );

      db.run("COMMIT", (err) => {
        if (err) {
          db.run("ROLLBACK");
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// Helper function to get premium user count
function getPremiumUserCount() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM premium_users WHERE expires_at > datetime("now")',
      (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });
}

// Helper function to get premium guild count
function getPremiumGuildCount() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM premium_guilds WHERE expires_at > datetime("now")',
      (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });
}
