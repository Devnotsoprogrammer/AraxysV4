const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user from the server",
  usage: "ban <user> <reason>",
  category: ["moderation", "sentinels"],
  cooldown: 1000,
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
                `${client.emotes.cross} | User not found! If user is not in a server, use \`${client.config.prefix}zban <user.id> <reason>\`.`
              )
              .setColor(client.color),
          ],
        });
      }

      // Get reason
      let reason = args.slice(1).join(" ") || "None";
      reason = `${message.author.tag} (${message.author.id}) | ${reason}`;

      // Get target member for role checks
      const targetMember = await message.guild.members
        .fetch(user.id)
        .catch(() => null);

      // Various checks
      if (
        user.id === client.user.id ||
        user.id === message.guild.ownerId ||
        user.id === message.author.id
      ) {
        const descriptions = {
          [client.user.id]: "You cannot ban me!",
          [message.guild.ownerId]: "You cannot ban the server owner!",
          [message.author.id]: "You cannot ban yourself!",
        };
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | ${descriptions[user.id]}`
              )
              .setColor(client.color),
          ],
        });
      }

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

      // Ban the user
      await message.guild.members.ban(user, { reason });

      const successEmbed = new EmbedBuilder()
        .setDescription(
          `${client.emotes.tick} | ${user} has been banned from the server`
        )
        .setColor("#000000");

      await message.reply({ embeds: [successEmbed] });
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
