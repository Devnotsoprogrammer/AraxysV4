const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "servericon",
  aliases: ["guildicon", "sicon"],
  category: ["essentials", "utilities"],
  description: "Shows the server's icon in different formats",
  usage: "",
  cooldown: 5,

  run: async (client, message, args) => {
    try {
      // Get server icon URL
      const iconURL = message.guild.iconURL({ size: 4096, dynamic: true });

      if (!iconURL) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | This server doesn't have an icon.`
              ),
          ],
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({
          name: `${message.guild.name}'s Icon`,
          iconURL: iconURL,
        })
        .setDescription(
          [
            "**Links:**",
            `[PNG](${message.guild.iconURL({ size: 4096, format: "png" })})`,
            `[JPG](${message.guild.iconURL({ size: 4096, format: "jpg" })})`,
            `[WEBP](${message.guild.iconURL({ size: 4096, format: "webp" })})`,
          ].join(" | ")
        )
        .setImage(iconURL)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Add server information
      embed.addFields({
        name: "📋 Server Information",
        value: [
          `**Name:** ${message.guild.name}`,
          `**ID:** \`${message.guild.id}\``,
          `**Created:** <t:${Math.floor(
            message.guild.createdTimestamp / 1000
          )}:R>`,
          `**Owner:** ${(await message.guild.fetchOwner()).user.tag}`,
          `**Members:** ${message.guild.memberCount.toLocaleString()}`,
        ].join("\n"),
        inline: false,
      });

      // Send embed
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Server Icon Command Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | An error occurred while fetching the server icon.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
