const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const moment = require("moment");

module.exports = {
  name: "roleinfo",
  aliases: ["rinfo", "role"],
  category: ["essentials", "utilities"],
  description: "Shows detailed information about a role",
  usage: "<role>",
  cooldown: 1000,

  run: async (client, message, args) => {
    try {
      // Get the role
      const role =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]) ||
        message.guild.roles.cache.find(
          (r) => r.name.toLowerCase() === args.join(" ")?.toLowerCase()
        );

      if (!role) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `${client.emotes.cross} | Please provide a valid role.`
              ),
          ],
        });
      }

      // Get role permissions
      const permissions = role.permissions.toArray();
      const permissionGroups = {
        general: [
          "Administrator",
          "ViewAuditLog",
          "ManageGuild",
          "ManageRoles",
          "ManageChannels",
          "ManageExpressions",
          "ManageWebhooks",
          "ManageNicknames",
          "ManageGuildExpressions",
          "ViewGuildInsights",
          "ModerateMembers",
        ],
        membership: [
          "CreateInstantInvite",
          "ChangeNickname",
          "KickMembers",
          "BanMembers",
        ],
        text: [
          "SendMessages",
          "SendMessagesInThreads",
          "CreatePublicThreads",
          "CreatePrivateThreads",
          "EmbedLinks",
          "AttachFiles",
          "AddReactions",
          "UseExternalEmojis",
          "UseExternalStickers",
          "MentionEveryone",
          "ManageMessages",
          "ManageThreads",
          "ReadMessageHistory",
          "SendTTSMessages",
          "UseApplicationCommands",
        ],
        voice: [
          "Connect",
          "Speak",
          "Stream",
          "UseVAD",
          "PrioritySpeaker",
          "MuteMembers",
          "DeafenMembers",
          "MoveMembers",
          "UseEmbeddedActivities",
        ],
        advanced: [
          "ViewChannel",
          "RequestToSpeak",
          "ManageEvents",
          "UseExternalSounds",
          "CreateEvents",
        ],
      };

      // Format permissions by group
      const formattedPerms = Object.entries(permissionGroups)
        .map(([group, perms]) => {
          const groupPerms = permissions.filter((p) => perms.includes(p));
          if (groupPerms.length) {
            return `**${
              group.charAt(0).toUpperCase() + group.slice(1)
            }**\n${groupPerms.map((p) => `\`${p}\``).join(", ")}`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n\n");

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(role.color || client.color || "#2f3136")
        .setTitle(`Role Information: ${role.name}`)
        .addFields({
          name: "📋 General Information",
          value: [
            `**Name:** ${role.name}`,
            `**ID:** \`${role.id}\``,
            `**Color:** \`${role.hexColor.toUpperCase()}\``,
            `**Position:** ${role.position}/${message.guild.roles.cache.size}`,
            `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
            `**Mentionable:** ${role.mentionable ? "Yes" : "No"}`,
            `**Hoisted:** ${role.hoist ? "Yes" : "No"}`,
            `**Managed:** ${role.managed ? "Yes" : "No"}`,
            `**Members:** ${role.members.size}`,
          ].join("\n"),
          inline: false,
        })
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Add role icon if exists
      if (role.iconURL()) {
        embed.setThumbnail(role.iconURL({ size: 4096 }));
      }

      // Add permissions if any exist
      if (formattedPerms) {
        embed.addFields({
          name: "🔑 Permissions",
          value: formattedPerms,
          inline: false,
        });
      }

      // Add preview of members with role (up to 10)
      if (role.members.size > 0) {
        const members = role.members
          .first(10)
          .map((m) => m.toString())
          .join(", ");
        embed.addFields({
          name: `👥 Members with Role ${
            role.members.size > 10 ? `(First 10/${role.members.size})` : ""
          }`,
          value: members,
          inline: false,
        });
      }

      // Send embed
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Role Info Command Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `${client.emotes.cross} | An error occurred while fetching role information.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
