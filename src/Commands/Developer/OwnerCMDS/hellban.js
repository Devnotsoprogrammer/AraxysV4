const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "globalban",
  aliases: ["gb", "hellban"],
  category: "developer",
  description: "Ban a user from all servers the bot is in",
  usage: "globalban <user ID> [reason]",
  ownerOnly: true,

  run: async (client, message, args) => {
    // Check if user is bot owner
    if (!client.config.ownerIds.includes(message.author.id)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | This command is only available to bot owners.`
            ),
        ],
      });
    }

    const userId = args[0];
    if (!userId) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | Please provide a user ID to ban.`
            ),
        ],
      });
    }

    // Validate user ID
    let targetUser;
    try {
      targetUser = await client.users.fetch(userId);
    } catch {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | Invalid user ID provided.`
            ),
        ],
      });
    }

    // Don't allow banning bot owners
    if (client.config.ownerIds.includes(userId)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | You cannot ban a bot owner.`
            ),
        ],
      });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    const fullReason = `Global Ban by ${message.author.tag} | Reason: ${reason}`;

    // Send initial status message
    const statusMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(client.color)
          .setDescription(
            `${client.emotes.loadz} | Starting global ban for ${targetUser.tag}...`
          ),
      ],
    });

    let successCount = 0;
    let failCount = 0;
    const failedGuilds = [];

    // Process each guild
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.members.ban(userId, {
          reason: fullReason,
          deleteMessageSeconds: 7 * 24 * 60 * 60, // 7 days of messages
        });
        successCount++;
      } catch (error) {
        failCount++;
        failedGuilds.push(guild.name);
      }

      // Update status every 5 guilds
      if ((successCount + failCount) % 5 === 0) {
        await statusMsg
          .edit({
            embeds: [
              new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                  `⌛ | Global ban in progress...\nProcessed: ${
                    successCount + failCount
                  }/${client.guilds.cache.size} servers`
                ),
            ],
          })
          .catch(() => {});
      }
    }

    // Create result message
    const resultEmbed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle("Global Ban Complete")
      .setDescription(`Ban results for ${targetUser.tag} (${userId})`)
      .addFields([
        {
          name: "Successful Bans",
          value: successCount.toString(),
          inline: true,
        },
        { name: "Failed Bans", value: failCount.toString(), inline: true },
        {
          name: "Total Servers",
          value: client.guilds.cache.size.toString(),
          inline: true,
        },
        { name: "Reason", value: reason },
      ])
      .setFooter({
        text: `Executed by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    // Add failed guilds to embed if any
    if (failedGuilds.length > 0) {
      const failedList =
        failedGuilds.slice(0, 10).join("\n") +
        (failedGuilds.length > 10
          ? `\nAnd ${failedGuilds.length - 10} more...`
          : "");
      resultEmbed.addFields([{ name: "Failed in Servers", value: failedList }]);
    }

    await statusMsg.edit({ embeds: [resultEmbed] });

    // Log the action if logging is enabled
    if (client.modlog) {
      const logEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle("Global Ban Executed")
        .addFields([
          {
            name: "Target User",
            value: `${targetUser.tag} (${userId})`,
            inline: true,
          },
          {
            name: "Moderator",
            value: `${message.author.tag} (${message.author.id})`,
            inline: true,
          },
          { name: "Reason", value: reason },
          {
            name: "Success Rate",
            value: `${successCount}/${client.guilds.cache.size} servers (${failCount} failed)`,
            inline: true,
          },
        ])
        .setTimestamp();

      client.modlog.send({ embeds: [logEmbed] });
    }
  },
};
