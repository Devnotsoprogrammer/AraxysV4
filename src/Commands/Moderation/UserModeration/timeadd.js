const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ms = require("ms");

module.exports = {
  name: "timeadd",
  description: "Add time to a user's mute/timeout",
  usage: "timeadd <user> <duration>",
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

      const additionalDuration = args[1] ? ms(args[1]) : ms("1m");
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

      if (!targetMember.communicationDisabledUntilTimestamp) {
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

      // Calculate new mute duration
      const newDuration =
        new Date(targetMember.communicationDisabledUntilTimestamp).getTime() +
        additionalDuration;
      await targetMember.timeout(
        newDuration,
        `Additional time added by ${message.author.tag}`
      );

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.tick} | Successfully added time to ${
                target.tag
              }'s mute. New duration: ${ms(newDuration - Date.now(), {
                long: true,
              })}`
            )
            .setColor(client.color),
        ],
      });
    } catch (error) {
      console.error("Error executing timeadd command:", error.code);

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | An error occurred while trying to add time to the mute.`
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
