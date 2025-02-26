const { Client, GuildAuditLogsEntry, GuildMember, User } = require("discord.js");
const Araxys = require("../../core/Araxys");

async function handleRateLimit() {
  // Handle rate limiting logic here, for example, by waiting before retrying
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 10 seconds
}

module.exports = async (client) => {
  client.on("guildAuditLogEntryCreate", async (audit) => {
    const { executor, target } = audit;
    const guildId = target instanceof GuildMember ? target.guild.id : null;
    const executorId = executor?.id;

    if (!guildId || !executorId) return;

    // Check if the guild is blacklisted
    const blacklist = await client.data.get(`blacklistserver_${client.user?.id}`) || [];
    if (blacklist.includes(guildId)) return;

    // Check if the anti-nuke feature is enabled
    const antinuke = await client.db.get(`${guildId}_antinuke`);
    if (antinuke !== true) return;

    // Check if the executor is an extra owner
    const isExtraOwner = await client.util.isExtraOwner(guildId, executorId);
    if (isExtraOwner) return;

    // Handle the specific action
    if (audit.action === "AUTO_MODERATION_RULE_CREATE") {
      if (executorId === target.guild.ownerId || executorId === client.user?.id) return;

      try {
        await client.util.banIfNotWhitelisted(
          guildId,
          executor,
          "serverup",
          "Auto Moderation Rule Create | Unwhitelisted User"
        );
      } catch (err) {
        if (err.code === 429) {
          // Handle rate limiting if necessary
          await handleRateLimit();
          return;
        }
        console.error("Failed to ban member:", err);
      }
    }
  });
};
