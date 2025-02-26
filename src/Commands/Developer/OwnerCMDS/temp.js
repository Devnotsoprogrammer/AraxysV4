const { EmbedBuilder } = require("discord.js");

const commandUsageDb = require("../../../database/commandUsageTracker");

const masterIds = ["1203931944421949533", "1237649310141906965"]; // Replace with actual master IDs

module.exports = {
  name: "untempblacklist",
  description:
    "Remove a user or guild from the temporary blacklist (Master only).",
  usage: "untempblacklist <user|guild> <@user|guildId>",
  category: "developer",
  run: async (client, message, args) => {
    if (!masterIds.includes(message.author.id)) {
      return message.reply(`${client.emotes.cross} | You do not have permission to use this command.`);
    }

    if (!args[0] || !args[1]) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `**Usage:** \`${client.config.prefix}untempblacklist <user|guild> <@user|guildId>\``
            )
            .setColor(client.color),
        ],
      });
    }

    const type = args[0].toLowerCase();
    const id = args[1].replace(/[<@!>]/g, "");

    try {
      if (type === "user") {
        const user = await client.users.fetch(id).catch(() => null);
        if (!user) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`Please provide a valid user.`)
                .setColor(client.color),
            ],
          });
        }

        await commandUsageDb.delete(`temp_blacklisted_users_${user.id}`);
        message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.tick} | User ${user.tag} has been removed from the temporary blacklist.`
              )
              .setColor(client.color),
          ],
        });
      } else if (type === "guild") {
        const guild = await client.guilds.fetch(id).catch(() => null);
        if (!guild) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`Please provide a valid guild ID.`)
                .setColor(client.color),
            ],
          });
        }

        await commandUsageDb.delete(`temp_blacklisted_servers_${guild.id}`);
        message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.tick} | Guild ${guild.name} has been removed from the temporary blacklist.`
              )
              .setColor(client.color),
          ],
        });
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Please provide a valid type (user/guild).`)
              .setColor(client.color),
          ],
        });
      }
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Error")
            .setDescription(`An error occurred: ${error.message}`)
            .setColor(client.color),
        ],
      });
    }
  },
};
