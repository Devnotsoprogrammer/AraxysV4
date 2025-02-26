const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    try {
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setTitle("Thanks for adding me! 🎉")
        .setDescription(
          `Hey ${owner.user.username}! Thanks for adding me to **${guild.name}**!\n\n` +
            "🔗 Join our support server for:\n" +
            "• Help and support\n" +
            "• Updates and announcements\n" +
            "• Premium features\n" +
            "• Bug reports\n" +
            "• Suggestions\n\n" +
            "Click the button below to join our support server!"
        )
        .setColor(client.color)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
          text: "Support Server Invite",
          iconURL:
            "https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&",
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Join Support Server")
          .setURL("https://discord.gg/wwcPCQ2emf")
          .setStyle(ButtonStyle.Link)
          .setEmoji("🔗")
      );

      // Function to check if a channel is mod-only
      const isModChannel = (channel) => {
        if (!channel) return false;
        const everyonePerms = channel.permissionsFor(guild.roles.everyone);
        const botPerms = channel.permissionsFor(client.user);

        return (
          channel.type === 0 && // Text channel
          !everyonePerms.has(PermissionFlagsBits.ViewChannel) && // Hidden from everyone
          botPerms.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ])
        );
      };

      // Find appropriate channel in order of priority
      let targetChannel;

      // 1. Try to find mod-only channels by common names
      const modChannelNames = [
        "mod-chat",
        "mod-only",
        "moderator",
        "mods",
        "staff-chat",
        "staff",
        "admin",
      ];
      targetChannel = guild.channels.cache.find(
        (channel) =>
          modChannelNames.some((name) =>
            channel.name.toLowerCase().includes(name)
          ) && isModChannel(channel)
      );

      // 2. If no mod channel found, try to find any private channel
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find((channel) =>
          isModChannel(channel)
        );
      }

      // 3. If no private channel, try general-type channels
      if (!targetChannel) {
        const generalChannelNames = [
          "general",
          "chat",
          "main",
          "lobby",
          "talk",
        ];
        targetChannel = guild.channels.cache.find(
          (channel) =>
            generalChannelNames.some((name) =>
              channel.name.toLowerCase().includes(name)
            ) &&
            channel.type === 0 &&
            channel
              .permissionsFor(client.user)
              .has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
              ])
        );
      }

      // 4. Last resort: use system channel or first available text channel
      if (!targetChannel) {
        targetChannel =
          guild.systemChannel ||
          guild.channels.cache.find(
            (channel) =>
              channel.type === 0 &&
              channel
                .permissionsFor(client.user)
                .has([
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                ])
          );
      }

      // Send message to the found channel
      if (targetChannel) {
        const serverEmbed = new EmbedBuilder()
          .setTitle("🎉 New Bot Added!")
          .setDescription(
            `Hey ${owner.user}! Thanks for adding me to the server!\n\n` +
              "To get started:\n" +
              "• Use `&help` to see all commands\n" +
              "• Join our support server for help\n" +
              "• Set up permissions as needed\n\n" +
              "Need help? Click the button below to join our support server!"
          )
          .setColor(client.color)
          .setTimestamp();

        await targetChannel.send({
          content: `${owner.user}`, // This will ping the owner
          embeds: [serverEmbed],
          components: [row],
          allowedMentions: { users: [owner.user.id] }, // Ensure the owner gets pinged
        });
      }

      // Try to DM the owner silently
      try {
        await owner.user.send({
          embeds: [embed],
          components: [row],
        });
      } catch {
        // Silent catch - we already sent a message in the server
      }

      // Log new server joins to logging channel
      const loggingChannel = client.channels.cache.get(
        "YOUR_LOGGING_CHANNEL_ID"
      );
      if (loggingChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("New Server Added")
          .setDescription(`Bot has been added to a new server!`)
          .addFields(
            { name: "Server Name", value: guild.name, inline: true },
            { name: "Server ID", value: guild.id, inline: true },
            {
              name: "Owner",
              value: `${owner.user.tag} (${owner.user.id})`,
              inline: true,
            },
            {
              name: "Member Count",
              value: guild.memberCount.toString(),
              inline: true,
            },
            {
              name: "Server Created",
              value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
            {
              name: "Message Sent To",
              value: targetChannel
                ? `#${targetChannel.name}`
                : "No channel found",
              inline: true,
            }
          )
          .setColor("Green")
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .setTimestamp();

        await loggingChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      // Silent error handling
    }
  },
};
