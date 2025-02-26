const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ms = require("ms");

module.exports = {
  name: "mute",
  aliases: ["timeout"],
  description: "Mute/Timeout a user",
  usage: "mute/timeout <user> [duration] <reason>",
  category: ["moderation"],
  cooldown: 1000,
  run: async (client, message, args) => {
    const araxysian = ["1203931944421949533", "1237649310141906965"];
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

      const duration = args[1] ? ms(args[1]) : ms("1m");
      let reason = args.slice(2).join(" ") || "None";
      reason = `${message.author.tag} (${message.author.id}) | ${reason}`;

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

      // Check if the user is already muted
      if (targetMember.communicationDisabledUntilTimestamp) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | This user is already muted! To increase the duration, use \`timeadd @user\`.`
              )
              .setColor(client.color),
          ],
        });
      }

      if (
        target.id === client.user.id ||
        target.id === message.guild.ownerId ||
        target.id === message.author.id ||
        araxysian.includes(target.id)
      ) {
        const descriptions = {
          [client.user.id]: "You cannot mute me!",
          [message.guild.ownerId]: "You cannot mute the server owner!",
          [message.author.id]: "You cannot mute yourself!",
          true: "You cannot mute my Master",
        };
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | ${
                  descriptions[araxysian.includes(target.id) ? true : target.id]
                }`
              )
              .setColor(client.color),
          ],
        });
      }

      if (
        targetMember &&
        message.guild.members.me.roles.highest.position <=
          targetMember.roles.highest.position
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | I cannot mute this user! The role is higher than my highest role.`
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
                `${client.emotes.cross} | You cannot mute someone with a higher role than you!`
              )
              .setColor(client.color),
          ],
        });
      }

      const dmEmbed = new EmbedBuilder()
        .setDescription(
          `${client.emotes.ban} | You have been muted in **${message.guild.name}**`
        )
        .setColor("#000000");
      await target.send({ embeds: [dmEmbed] }).catch(() => null);

      // Attempt to mute the user
      await targetMember.timeout(duration, reason);

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.tick} | Successfully muted ${
                target.tag
              } for ${ms(duration, { long: true })}`
            )
            .setColor(client.color),
        ],
      });
    } catch (error) {
      //   console.error("Error executing mute command:", error.code);

      let errorMessage = `${client.emotes.cross} | I could not mute this user!`;

      if (error.code === 50013) {
        errorMessage = `${client.emotes.cross} | I cannot mute this user! They have a higher role than me!`;
      }

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(errorMessage)
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
