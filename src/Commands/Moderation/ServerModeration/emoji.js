const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "addemoji",
  aliases: ["stealemoji", "steal"],
  category: "moderation",
  description: "Add custom emojis to your server",
  usage: "addemoji <emoji/url> [name]",
  userPermissions: ["ManageGuildExpressions"],
  botPermissions: ["ManageGuildExpressions"],
  cooldown: 5,

  run: async (client, message, args) => {
    try {
      // Permission checks
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.ManageGuildExpressions
        )
      ) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                `${client.emotes.cross} | You need \`Manage Emojis And Stickers\` permission to use this command.`
              ),
          ],
        });
      }

      if (
        !message.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageGuildExpressions
        )
      ) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                `${client.emotes.cross} | I need \`Manage Emojis And Stickers\` permission to add emojis.`
              ),
          ],
        });
      }

      // Check if emoji or URL is provided
      if (!args[0]) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                [
                  "**Usage:**",
                  "```",
                  `${message.guild.prefix}addemoji <emoji/url> [name]`,
                  "```",
                  "**Examples:**",
                  `• ${message.guild.prefix}addemoji 😀`,
                  `• ${message.guild.prefix}addemoji https://example.com/emoji.png coolEmoji`,
                  `• ${message.guild.prefix}addemoji <:custom:123456789> newName`,
                ].join("\n")
              ),
          ],
        });
      }

      let emoji = args[0];
      let name = args[1];

      // Check if it's a custom emoji
      if (emoji.startsWith("<") && emoji.endsWith(">")) {
        const id = emoji.match(/\d{15,}/g)[0];
        const type = emoji.startsWith("<a:") ? "gif" : "png";
        const url = `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`;

        if (!name) {
          name = emoji.split(":")[1];
        }

        emoji = url;
      }

      // Check if it's a URL
      const urlRegex = /(http[s]?:\/\/.*\.(?:png|jpg|gif))/i;
      if (!urlRegex.test(emoji)) {
        // If not URL and not custom emoji, it might be a unicode emoji
        const unicodeRegex =
          /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;
        if (!unicodeRegex.test(emoji)) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                  `${client.emotes.cross} | Please provide a valid emoji or image URL.`
                ),
            ],
          });
        }
      }

      // Generate name if not provided
      if (!name) {
        name = "emoji_" + Math.random().toString(36).substring(2, 8);
      }

      // Validate name
      if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                `${client.emotes.cross} | Emoji name can only contain letters, numbers, and underscores.`
              ),
          ],
        });
      }

      // Create emoji
      const loadingMsg = await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription("🔄 Adding emoji to server..."),
        ],
      });

      try {
        const newEmoji = await message.guild.emojis.create({
          attachment: emoji,
          name: name,
        });

        return loadingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setTitle(`${client.emotes.tick} | Emoji Added Successfully`)
              .setDescription(
                [
                  `**Name:** \`:${newEmoji.name}:\``,
                  `**ID:** \`${newEmoji.id}\``,
                  `**Preview:** ${newEmoji.toString()}`,
                  "",
                  `**Added By:** ${message.author.toString()}`,
                ].join("\n")
              )
              .setThumbnail(newEmoji.url)
              .setTimestamp(),
          ],
        });
      } catch (error) {
        return loadingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | Failed to add emoji: ${error.message}`
              ),
          ],
        });
      }
    } catch (error) {
      console.error("Add Emoji Error:", error);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color2)
            .setDescription(
              `${client.emotes.cross} | An error occurred while adding the emoji.`
            ),
        ],
      });
    }
  },
};
