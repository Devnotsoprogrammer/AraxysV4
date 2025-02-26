const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ping",
  aliases: ["pong"],
  description: "Display bot's latency!",
  usage: "ping",
  category: "essentials",
  run: async (client, message, args) => {
    if (await client.util.isBlackListedServer(message.guild.id)) {
      return message.reply(
        "This server is blacklisted and cannot use this command."
      );
    }

    try {
      if (
        !message.guild.members.me.permissions.has(
          PermissionFlagsBits.EmbedLinks
        )
      ) {
        return message.reply("I lack permission to send `EmbedLinks`.");
      }

      // Measure WebSocket Ping
      const apiPing = Math.round(client.ws.ping);

      // Create dynamic embed
      const embed = new EmbedBuilder()
        .setTitle("🏓 Pong!")
        .setDescription(`📡 **Latency:** \`${apiPing} ms\``)
        .setColor(client.color) // You can adjust the color code as needed
        .addFields(
          { name: "Bot Latency", value: `\`${apiPing} ms\``, inline: true },
          { name: "WebSocket Status", value: "🟢 Online", inline: true }
        )
        .setTimestamp()
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        });

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
