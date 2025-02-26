const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "massban",
  description: "Ban multiple users from the server",
  usage: "massban <user1> <user2> ... <reason>",
  category: ["moderation", "sentinels"],
  cooldown: 5000,
  run: async (client, message, args) => {
    try {
      // Check if user has the 'Ban Members' permission and is an admin
      if (
        !message.member.permissions.has(PermissionFlagsBits.BanMembers) ||
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You must have the \`Ban Members\` and \`Administrator\` permissions!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Check bot permissions
      if (
        !message.guild.members.me.permissions.has(
          PermissionFlagsBits.BanMembers
        )
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | I must have the \`Ban Members\` permission!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Ensure at least one user is tagged
      if (args.length < 1) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You must tag at least one user to ban!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Split user IDs from the reason
      const reasonIndex = args.findIndex((arg) => !/\d+/.test(arg));
      const userIds = args.slice(0, reasonIndex);
      const reason = args.slice(reasonIndex).join(" ") || "None";

      // Check which users are already banned
      const alreadyBannedUsers = [];
      for (const userId of userIds) {
        const banInfo = await message.guild.bans
          .fetch(userId)
          .catch(() => null);
        if (banInfo) {
          alreadyBannedUsers.push(userId);
        }
      }

      if (alreadyBannedUsers.length > 0) {
        const alreadyBannedEmbed = new EmbedBuilder()
          .setDescription(
            `${
              client.emotes.cross
            } | The following users are already banned: ${alreadyBannedUsers.join(
              ", "
            )}`
          )
          .setColor("#000000");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("continue")
            .setLabel("Continue")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({
          embeds: [alreadyBannedEmbed],
          components: [row],
        });

        const collector = msg.createMessageComponentCollector({
          time: 60000,
        });

        collector.on("collect", async (i) => {
          if (i.user.id !== message.author.id) {
            return i.reply({
              content: "You are not allowed to use this button!",
              ephemeral: true,
            });
          }

          if (i.customId === "continue") {
            await msg.edit({ components: [] });
            const filteredUserIds = userIds.filter(
              (userId) => !alreadyBannedUsers.includes(userId)
            );
            await processBatch(filteredUserIds, reason, msg, client, message);
          } else {
            const cancelEmbed = new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | Mass ban action canceled`
              )
              .setColor("#000000");

            await i.update({ embeds: [cancelEmbed], components: [] });
          }
        });

        collector.on("end", async (collected, reason) => {
          if (reason === "time" && msg.editable) {
            const timeoutEmbed = new EmbedBuilder()
              .setDescription("Mass ban continuation timed out")
              .setColor("#000000");

            await msg.edit({ embeds: [timeoutEmbed], components: [] });
          }
        });
      } else {
        await processBatch(userIds, reason, null, client, message);
      }
    } catch (error) {
      console.error("Error executing mass ban command:", error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | An error occurred while executing the command.`
            )
            .setColor(client.color),
        ],
      });
    }
  },
};
async function processBatch(userIds, reason, progressMsg, client, message) {
  let count = 0;
  let progressEmbed;

  for (const userId of userIds) {
    const user = await fetchUser(client, message, userId);
    if (user) {
      try {
        // Try to DM the user
        try {
          const dmEmbed = new EmbedBuilder()
            .setDescription(
              `${client.emotes.ban} | You have been banned from **${message.guild.name}**`
            )
            .setColor("#000000");
          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          // Ignore DM errors
        }

        await message.guild.members.ban(user, { reason });
        count++;

        progressEmbed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.ban} | Banning in progress: ${count} out of ${userIds.length} users banned`
          )
          .setColor("#000000");

        // Re-edit the original message or send a new one if editing fails
        if (progressMsg) {
          await progressMsg
            .edit({ embeds: [progressEmbed] })
            .catch(async (error) => {
              console.error("Error editing message:", error);
              progressMsg = null; // Set progressMsg to null to indicate it is not editable
            });
        }
      } catch (error) {
        console.error(`Error banning user ${userId}:`, error);
      }
    } else {
      const errorEmbed = new EmbedBuilder()
        .setDescription(`${client.emotes.cross} | User not found: ${userId}`)
        .setColor("#000000");
      await message.reply({ embeds: [errorEmbed] });
    }
  }

  const finalEmbed = new EmbedBuilder()
    .setDescription(
      `All users have been banned successfully. Total banned: ${count}`
    )
    .setColor("#000000");

  // Send a new embed if the progressMsg was not editable
  if (!progressMsg) {
    await message.reply({ embeds: [finalEmbed] });
  } else {
    await progressMsg.edit({ embeds: [finalEmbed] }).catch(async (error) => {
      console.error("Error editing message:", error);
      await message.reply({ embeds: [finalEmbed] });
    });
  }
}

async function fetchUser(client, message, mention) {
  if (!mention) return null;

  const id = mention.match(/^<@!?(\d+)>$/)
    ? mention.match(/^<@!?(\d+)>$/)[1]
    : mention.match(/^\d+$/)
    ? mention
    : null;
  return id ? client.users.fetch(id).catch(() => null) : null;
}
