const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "roleicon",
  aliases: ["ricon", "ri"],
  category: ["moderation", "sentinels"],
  description: "View or set a role's icon",
  usage: "<role> [icon_url]",
  cooldown: 5,

  run: async (client, message, args) => {
    try {
      // Check if user has permission to manage roles
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | You need \`Manage Roles\` permission to use this command.`
              ),
          ],
        });
      }

      // Get the role
      const role =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]) ||
        message.guild.roles.cache.find(
          (r) => r.name.toLowerCase() === args[0]?.toLowerCase()
        );

      if (!role) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | Please provide a valid role.`
              ),
          ],
        });
      }

      // If no icon URL provided, show current icon
      if (!args[1]) {
        const embed = new EmbedBuilder()
          .setColor(client.color)
          .setTitle(`Role Icon: ${role.name}`)
          .setDescription(
            role.iconURL()
              ? `[Click here to view icon](${role.iconURL({ size: 4096 })})`
              : "This role has no icon."
          )
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          });

        if (role.iconURL()) {
          embed.setThumbnail(role.iconURL({ size: 4096 }));
        }

        return message.channel.send({ embeds: [embed] });
      }

      // Check bot permissions
      if (
        !message.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageRoles
        )
      ) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | I need \`Manage Roles\` permission to set role icons.`
              ),
          ],
        });
      }

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | I cannot edit this role. Make sure my role is above the target role.`
              ),
          ],
        });
      }

      // Try to set the role icon
      try {
        await role.setIcon(args[1]);

        const embed = new EmbedBuilder()
          .setColor(client.color)
          .setTitle("Role Icon Updated")
          .setDescription(`Successfully updated icon for role ${role}`)
          .setThumbnail(role.iconURL({ size: 4096 }))
          .setFooter({
            text: `Updated by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          });

        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error("Role Icon Set Error:", error);
        message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | Failed to set role icon. Make sure the URL is valid and the server has the required boosts.`
              ),
          ],
        });
      }
    } catch (error) {
      console.error("Role Icon Command Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | An error occurred while managing the role icon.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
