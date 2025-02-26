const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const moment = require("moment");

module.exports = {
  name: "profile",
  aliases: ["userinfo", "whois", "user"],
  category: ["essentials", "utilities"],
  description: "Shows detailed information about a user",
  usage: "[user]",
  cooldown: 5,

  run: async (client, message, args) => {
    try {
      // Get target user
      let target =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]) ||
        message.member;

      // Fetch user to get banner/accent color
      const user = await client.users.fetch(target.id, { force: true });

      // Get user badges
      const flags = user.flags?.toArray() || [];
      const badges = {
        BugHunterLevel1: "🐛",
        BugHunterLevel2: "🐛",
        CertifiedModerator: "👮‍♂️",
        HypeSquadOnlineHouse1: "🏠",
        HypeSquadOnlineHouse2: "🏠",
        HypeSquadOnlineHouse3: "🏠",
        HypeSquadEvents: "🎉",
        Partner: "👑",
        PremiumEarlySupporter: "⭐",
        Staff: "👨‍💼",
        VerifiedBot: "🤖",
        VerifiedDeveloper: "👨‍💻",
      };

      // Get key permissions
      const keyPermissions = [
        "Administrator",
        "ManageGuild",
        "ManageRoles",
        "ManageChannels",
        "ManageMessages",
        "ManageWebhooks",
        "ManageNicknames",
        "ManageEmojisAndStickers",
        "KickMembers",
        "BanMembers",
        "MentionEveryone",
      ];

      const userPermissions = keyPermissions.filter((perm) =>
        target.permissions.has(PermissionsBitField.Flags[perm])
      );

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(
          user.accentColor || target.displayColor || client.color || "#000000"
        )
        .setAuthor({
          name: `${user.tag}'s Profile`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .addFields(
          {
            name: "👤 User Information",
            value: [
              `**ID:** \`${user.id}\``,
              `**Tag:** \`${user.tag}\``,
              `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
              `**Badges:** ${
                flags.map((flag) => badges[flag] || flag).join(" ") || "None"
              }`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "📋 Member Information",
            value: [
              `**Joined Server:** <t:${Math.floor(
                target.joinedTimestamp / 1000
              )}:R>`,
              `**Nickname:** ${target.nickname || "None"}`,
              `**Highest Role:** ${
                target.roles.highest.id === message.guild.id
                  ? "None"
                  : target.roles.highest
              }`,
              `**Roles [${target.roles.cache.size - 1}]:** ${
                target.roles.cache.size - 1
                  ? target.roles.cache
                      .filter((r) => r.id !== message.guild.id)
                      .sort((a, b) => b.position - a.position)
                      .first(4)
                      .join(", ") +
                    (target.roles.cache.size - 1 > 4
                      ? ` and ${target.roles.cache.size - 5} more...`
                      : "")
                  : "None"
              }`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Add key permissions if any
      if (userPermissions.length) {
        embed.addFields({
          name: "🔑 Key Permissions",
          value: userPermissions.map((perm) => `\`${perm}\``).join(", "),
          inline: false,
        });
      }

      // Add banner if exists
      if (user.banner) {
        embed.setImage(user.bannerURL({ dynamic: true, size: 4096 }));
      }

      // Send embed
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Profile Command Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | An error occurred while fetching user information.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
