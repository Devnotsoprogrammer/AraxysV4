const { ActivityType, Client } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "ready",
  once: true,
  /**
   * @param {Client} client
   */
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    client.logger.log(`Logged in as ${client.user.tag}`, "ready");

    const updatePresence = () => {
      const serverCount = client.guilds.cache.size;
      const activityMessage = `Protecting ${serverCount} servers | Prefix: &`;

      client.user.setPresence({
        activities: [
          {
            name: activityMessage,
            type: ActivityType.Watching,
          },
        ],
        status: "dnd",
        afk: false,
      });

      console.log(
        `Activity presence updated to: "Watching: ${activityMessage}"`
      );
    };

    updatePresence();

    client.on("guildMemberUpdate", async (oldMember, newMember) => {
      if (newMember.id === client.user.id && newMember.nickname !== "Araxys") {
        await newMember
          .setNickname("Araxys")
          .then(() => console.log('Bot name changed back to "Araxys"'))
          .catch(console.error);
      }
    });
  },
};
