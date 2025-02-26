const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const premiumFunctions = require("../../utils/premiumUtil");

module.exports = {
  name: "pong",
  description: "Give latency of Bot (Premium only)!",
  usage: "ping",
  category: "premium",
  premium: true, // Indicate that this is a premium-only command
  run: async (client, message, args) => {
    // Check if the user or guild has premium status
    const isPremium = await premiumFunctions.isPremium(message, module.exports);

    if (!isPremium) {
      return message.reply({
        embeds: [
          premiumFunctions.premiumEmbed()
        ]
      });
    }

    try {
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.EmbedLinks)) {
        return message.reply("I don't have permission to send `EmbedLinks`.");
      }

      const embed = new EmbedBuilder()
        .setTitle("Pong!")
        .setDescription(`Latency: ${client.ws.ping} ms`)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setColor("Blue");

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply("There was an error while executing this command!");
      console.error("Error executing ping command:", error);
    }
  },
};
