const { Client, GuildAuditLogsEntry, GuildMember, User } = require("discord.js");
const Araxys = require("../../core/Araxys");

async function handleRateLimit() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

module.exports = async (client) => {
  client.on("guildMemberAdd", async (member) => {
    
    let check = await client.util.BlacklistCheck(member.guild);
    if (check) return;

    
    const auditLogs = await member.guild
      .fetchAuditLogs({ limit: 1, type: "BOT_ADD" })
      .catch((_) => {});
    const logs = auditLogs?.entries?.first();
    if (!logs) return;

    const { executor, target, createdTimestamp } = logs;
    let difference = Date.now() - createdTimestamp;
    if (difference > 3600000) return; 

    
    const whitelistData = await client.db.get(`${member.guild.id}_${executor?.id}_wl`);
    const antinuke = await client.db.get(`${member.guild.id}_antinuke`);
    if (antinuke !== true) return;

    
    const isExtraOwner = await client.util.isExtraOwner(member.guild.id, executor.id);
    if (isExtraOwner) return;

    if (whitelistData && whitelistData.botadd) return;
    if (executor.id === member.guild.ownerId) return;
    if (executor.id === client.user.id) return;
    if (!target.bot) return;
    if (target.id !== member.id) return;

    try {
      executor.guild = member.guild;
      target.guild = member.guild;
      await client.util.banIfNotWhitelisted(
        member.guild.id,
        executor,
        "botadd",
        "Unwanted Bot Added to the Server | Unwhitelisted User"
      );
      await client.util.banIfNotWhitelisted(
        member.guild.id,
        target,
        "botadd",
        "Illegal Bot | Unwhitelisted User"
      );
    } catch (err) {
      if (err.code === 429) {
        await handleRateLimit();
      } else {
        console.error("Failed to ban member:", err);
      }
    }
  });
};
