const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "zban",
  description: "Ban a user from the server",
  usage: "ban <user> <reason>",
  category: ["moderation", "sentinels"],
  cooldown: 10000,
  run: async (client, message, args) => {
    try {
      // Check user permissions
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You must have the \`Ban Members\` permission!`
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

      // Get user
      const user = await fetchUser(client, message, args[0]);
      if (!user) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | User not found! Please provide a valid user ID or mention.`
              )
              .setColor(client.color),
          ],
        });
      }

      // Get reason
      let reason = args.slice(1).join(" ") || "None";
      reason = `${message.author.tag} (${message.author.id}) | ${reason}`;

      // Various checks
      if (user.id === client.user.id) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.emotes.cross} | You cannot ban me!`)
              .setColor(client.color),
          ],
        });
      }

      if (user.id === message.author.id) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You cannot ban yourself!`
              )
              .setColor(client.color),
          ],
        });
      }

      if (user.id === message.guild.ownerId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You cannot ban the server owner!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Check if target member exists and perform role hierarchy check
      const targetMember = await message.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (
        targetMember &&
        message.member.roles.highest.position <=
          targetMember.roles.highest.position &&
        !message.guild.ownerId
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You cannot ban someone with a higher role than you!`
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
          `${client.emotes.cross} | Are you sure you want to ban ${user}?`
        )
        .setColor(client.color);

      const msg = await message.reply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({
        time: 15000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "You are not allowed to use this button!",
            flags: 64,
          });
        }

        if (i.customId === "yes") {
          try {
            // Try to DM the user
            try {
              const dmEmbed = new EmbedBuilder()
                .setDescription(
                  `${client.emotes.ban} | You have been banned from **${message.guild.name}**`
                )
                .setColor(client.color);
              await user.send({ embeds: [dmEmbed] });
            } catch (error) {
              // Ignore DM errors
            }

            await message.guild.members.ban(user.id, { reason });

            const successEmbed = new EmbedBuilder()
              .setDescription(
                `${client.emotes.tick} | ${user.tag} has been banned from the server`
              )
              .setColor(client.color);

            await i.update({ embeds: [successEmbed], components: [] });
          } catch (error) {
            const errorEmbed = new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | Error: ${error.message}`
              )
              .setColor(client.color);

            await i.update({ embeds: [errorEmbed], components: [] });
          }
        } else {
          const cancelEmbed = new EmbedBuilder()
            .setDescription(`${client.emotes.cross} | Ban action canceled`)
            .setColor(client.color);

          await i.update({ embeds: [cancelEmbed], components: [] });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time" && msg.editable) {
          const timeoutEmbed = new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | Ban confirmation timed out`
            )
            .setColor(client.color);

          await msg.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });
    } catch (error) {
      console.error("Error executing ban command:", error);
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

async function fetchUser(client, message, mention) {
  if (!mention) return null;

  if (mention.match(/^<@!?(\d+)>$/)) {
    const id = mention.match(/^<@!?(\d+)>$/)[1];
    return await client.users.fetch(id).catch(() => null);
  }

  if (mention.match(/^\d+$/)) {
    return await client.users.fetch(mention).catch(() => null);
  }

  return null;
}
