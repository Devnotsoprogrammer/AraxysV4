const {
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { cooldown } = require("./ban");

module.exports = {
  name: "unban",
  description: "Unban a user from the server",
  usage: "unban <user> <reason>",
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
          if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
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

          // Get user ID
          const ID = args[0];
          if (!ID) {
              return message.reply({
                  embeds: [
                      new EmbedBuilder()
                          .setDescription("You didn't provide the user ID whom you want to unban.")
                          .setColor(client.color),
                  ],
              });
          }

          // Fetch user to ensure they are banned
          const user = await fetchUser(client, message, ID);
          if (!user) {
              return message.reply({
                  embeds: [
                      new EmbedBuilder()
                          .setDescription(`${client.emotes.cross} | User with ID \`${ID}\` is not banned on this server.`)
                          .setColor(client.color),
                  ],
              });
          }

          // Unban the user
          await message.guild.members.unban(ID);

          const successEmbed = new EmbedBuilder()
              .setDescription(
                  `${client.emotes.tick} | Successfully unbanned user with ID \`${ID}\`.`
              )
              .setColor(client.color);

          await message.reply({ embeds: [successEmbed] });

      } catch (error) {
          console.error("Error executing unban command:", error);
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

  const id = mention.match(/^<@!?(\d+)>$/) ? mention.match(/^<@!?(\d+)>$/)[1] : mention.match(/^\d+$/) ? mention : null;
  return id ? client.users.fetch(id).catch(() => null) : null;
}
