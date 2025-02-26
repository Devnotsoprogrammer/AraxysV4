const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "unmute",
  aliases: ["untimeout"],
  description: "Unmute/Untimeout a user",
  usage: "unmute/untimeout <user>",
  category: ["moderation"],
  cooldown: 1000,
  run: async (client, message, args) => {
    try {
      if (
        !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | You must have the \`Moderate Members\` permission!`
          )
          .setColor(client.color);
        return message.reply({ embeds: [embed] });
      }

      if (
        !message.guild.members.me.permissions.has(
          PermissionFlagsBits.ModerateMembers
        )
      ) {
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | I must have the \`Moderate Members\` permission!`
          )
          .setColor(client.color);
        return message.reply({ embeds: [embed] });
      }

      const target = await fetchUser(client, message, args[0]);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.emotes.cross} | User not found!`)
              .setColor(client.color),
          ],
        });
      }

      const targetMember = await message.guild.members
        .fetch(target.id)
        .catch(() => null);

      if (!targetMember) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | Unable to fetch the member!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Check if the user is not muted
      if (targetMember.communicationDisabledUntilTimestamp === null) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | This user is not muted!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Attempt to unmute the user
      await targetMember.timeout(null);

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.tick} | Successfully unmuted ${target.tag}`
            )
            .setColor(client.color),
        ],
      });
    } catch (error) {
      console.error("Error executing unmute command:", error.code);

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | An error occurred while trying to unmute the user.`
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
