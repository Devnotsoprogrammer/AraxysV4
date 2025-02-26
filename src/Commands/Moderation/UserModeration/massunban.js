const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "unbanall",
  description: "Unban all users from the server",
  usage: "unbanall",
  category: ["moderation", "sentinels"],
  cooldown: 5000,
  run: async (client, message) => {
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

      // Fetch all bans
      const bans = await message.guild.bans.fetch();
      if (bans.size === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | There are no banned users in this server.`
              )
              .setColor(client.color),
          ],
        });
      }

      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("yes")
          .setLabel("Yes")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("no")
          .setLabel("No")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.emotes.cross} | Are you sure you want to unban all users?`
        )
        .setColor(client.color);

      const msg = await message.reply({ embeds: [embed], components: [row] });

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

        if (i.customId === "yes") {
          await msg.edit({ components: [] });
          await processBatch(bans, msg, client, message);
        } else {
          const cancelEmbed = new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | Unban all action canceled`
            )
            .setColor(client.color);

          await i.update({ embeds: [cancelEmbed], components: [] });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time" && msg.editable) {
          const timeoutEmbed = new EmbedBuilder()
            .setDescription("Unban all confirmation timed out")
            .setColor(client.color);

          await msg.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });
    } catch (error) {
      console.error("Error executing unban all command:", error);
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
async function processBatch(bans, progressMsg, client, message) {
  let count = 0;
  let progressEmbed;

  for (const [userId, banInfo] of bans) {
    try {
      await message.guild.members.unban(userId);
      count++;

      progressEmbed = new EmbedBuilder()
        .setDescription(
          `${client.emotes.tick} | Unbanning in progress: ${count} out of ${bans.size} users unbanned`
        )
        .setColor(client.color);

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
      // Handle the "Unknown Ban" error gracefully
      if (error.code === 10026) {
        console.log(`User with ID ${userId} is not banned.`);
        continue;
      } else {
        console.error(`Error unbanning user ${userId}:`, error);
        const errorEmbed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | Error unbanning user with ID: ${userId}`
          )
          .setColor(client.color);
        await message.reply({ embeds: [errorEmbed] });
      }
    }
  }

  const finalEmbed = new EmbedBuilder()
    .setDescription(
      `All users have been unbanned successfully. Total unbanned: ${count}`
    )
    .setColor(client.color);

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
