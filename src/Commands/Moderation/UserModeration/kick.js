const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "kick",
  description: "Kick a user from the server",
  usage: "kick <user> <reason>",
  category: ["moderation", "sentinels"],
  run: async (client, message, args) => {
    const araxysian = ["1203931944421949533", "1237649310141906965"];
    try {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
      ) {
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | You must have the \`Kick Members\` permission!`
          )
          .setColor("#000000");
        return message.reply({ embeds: [embed] });
      }

      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.Flags.KickMembers
        )
      ) {
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | I must have the \`Kick Members\` permission!`
          )
          .setColor("#000000");
        return message.reply({ embeds: [embed] });
      }

      const user = await fetchUser(client, message, args[0]);
      if (!user) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | User not found! If user is not in the server.`
              )
              .setColor(client.color),
          ],
        });
      }

      let reason = args.slice(1).join(" ") || "None";
      reason = `${message.author.tag} (${message.author.id}) | ${reason}`;

      const targetMember = await message.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (
        user.id === client.user.id ||
        user.id === message.guild.ownerId ||
        user.id === message.author.id ||
        araxysian.includes(user.id)
      ) {
        const descriptions = {
          [client.user.id]: "You cannot kick me!",
          [message.guild.ownerId]: "You cannot kick the server owner!",
          [message.author.id]: "You cannot kick yourself!",
          true: "You cannot kick my Master",
        };
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | ${
                  descriptions[araxysian.includes(user.id) ? true : user.id]
                }`
              )
              .setColor(client.color),
          ],
        });
      }

      // Role hierarchy check for the bot
      if (
        targetMember &&
        message.guild.members.me.roles.highest.position <=
          targetMember.roles.highest.position
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | I cannot kick this user! The role is higher than my highest role.`
              )
              .setColor(client.color),
          ],
        });
      }

      // Role hierarchy check for the executor
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
                `${client.emotes.cross} | You cannot kick someone with a higher role than you!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Attempt to send a DM to the user before kicking
      try {
        const dmEmbed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.ban} | You have been kicked from **${message.guild.name}**`
          )
          .setColor("#000000");
        await user.send({ embeds: [dmEmbed] }).catch(() => null); // Silently catch DM errors

        await message.guild.members.kick(user, { reason });
        const successEmbed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.tick} | ${user.tag} has been kicked from the server`
          )
          .setColor("#000000");
        return message.reply({ embeds: [successEmbed] });
      } catch (error) {
        console.error("Error executing kick command:", error);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | An error occurred while executing the command.`
              )
              .setColor(client.color),
          ],
        });
      }
    } catch (error) {
      console.error("Error executing kick command:", error);
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

  const mentionRegex = /^<@!?(\d+)>$/;
  if (mention.match(mentionRegex)) {
    const id = mention.match(mentionRegex)[1];
    return await client.users.fetch(id).catch(() => null);
  }

  if (/^\d+$/.test(mention)) {
    return await client.users.fetch(mention).catch(() => null);
  }

  return null;
}
